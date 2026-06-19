import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus } from '@thoovitickets/database';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            ticketType: {
              include: {
                event: {
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                    startDate: true,
                    venue: true,
                    city: true,
                    imageUrl: true,
                    status: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) return { items: [], total: 0, itemCount: 0 };

    const validItems = cart.items.filter(
      (item) => item.ticketType.event.status === EventStatus.PUBLISHED,
    );

    const total = validItems.reduce(
      (sum, item) => sum + Number(item.ticketType.price) * item.quantity,
      0,
    );

    return {
      items: validItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        ticketType: {
          id: item.ticketType.id,
          name: item.ticketType.name,
          price: Number(item.ticketType.price),
          currency: item.ticketType.currency,
          maxPerOrder: item.ticketType.maxPerOrder,
          available: item.ticketType.totalQty - item.ticketType.soldQty,
        },
        event: item.ticketType.event,
      })),
      total,
      itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  async addItem(userId: string, dto: AddToCartDto) {
    const ticketType = await this.prisma.ticketType.findUnique({
      where: { id: dto.ticketTypeId },
      include: { event: { select: { status: true, saleCutoffDate: true } } },
    });

    if (!ticketType) throw new NotFoundException('Ticket type not found');
    if (ticketType.event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Event is not available for booking');
    }
    if (ticketType.event.saleCutoffDate && new Date() > ticketType.event.saleCutoffDate) {
      throw new BadRequestException('Ticket sales have ended for this event');
    }
    if (!ticketType.isActive) throw new BadRequestException('This ticket type is not available');

    const available = ticketType.totalQty - ticketType.soldQty;
    if (dto.quantity > available) {
      throw new BadRequestException(`Only ${available} tickets available`);
    }
    if (dto.quantity > ticketType.maxPerOrder) {
      throw new BadRequestException(`Maximum ${ticketType.maxPerOrder} tickets per order`);
    }

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_ticketTypeId: { cartId: cart.id, ticketTypeId: dto.ticketTypeId } },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + dto.quantity;
      if (newQty > available) {
        throw new BadRequestException(`Only ${available} tickets available (${existingItem.quantity} already in cart)`);
      }
      if (newQty > ticketType.maxPerOrder) {
        throw new BadRequestException(`Maximum ${ticketType.maxPerOrder} tickets per order`);
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          ticketTypeId: dto.ticketTypeId,
          quantity: dto.quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { ticketType: true },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    const available = item.ticketType.totalQty - item.ticketType.soldQty;
    if (dto.quantity > available) {
      throw new BadRequestException(`Only ${available} tickets available`);
    }
    if (dto.quantity > item.ticketType.maxPerOrder) {
      throw new BadRequestException(`Maximum ${item.ticketType.maxPerOrder} tickets per order`);
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) throw new NotFoundException('Cart not found');

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return { items: [], total: 0, itemCount: 0 };
  }
}
