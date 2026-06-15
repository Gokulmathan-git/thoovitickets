import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus, Prisma } from '@thoovitickets/database';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromCart(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            ticketType: {
              include: { event: { select: { id: true, title: true, status: true } } },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      if (item.ticketType.event.status !== 'PUBLISHED') {
        throw new BadRequestException(`Event "${item.ticketType.event.title}" is no longer available`);
      }
      const available = item.ticketType.totalQty - item.ticketType.soldQty;
      if (item.quantity > available) {
        throw new BadRequestException(
          `Only ${available} "${item.ticketType.name}" tickets available for "${item.ticketType.event.title}"`,
        );
      }
    }

    const orderNumber = this.generateOrderNumber();
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + Number(item.ticketType.price) * item.quantity,
      0,
    );

    // Atomic transaction: create order + reserve tickets + clear cart
    const order = await this.prisma.$transaction(async (tx) => {
      // Re-check availability inside transaction to prevent race conditions
      for (const item of cart.items) {
        const ticketType = await tx.ticketType.findUnique({
          where: { id: item.ticketTypeId },
        });
        if (!ticketType) throw new BadRequestException('Ticket type not found');
        const available = ticketType.totalQty - ticketType.soldQty;
        if (item.quantity > available) {
          throw new BadRequestException(
            `Only ${available} "${ticketType.name}" tickets left`,
          );
        }
      }

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          totalAmount,
          guestEmail: dto.guestEmail,
          guestName: dto.guestName,
          guestPhone: dto.guestPhone,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
          items: {
            create: cart.items.map((item) => ({
              ticketTypeId: item.ticketTypeId,
              eventId: item.ticketType.event.id,
              quantity: item.quantity,
              unitPrice: item.ticketType.price,
              totalPrice: Number(item.ticketType.price) * item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              ticketType: { select: { name: true, price: true, currency: true } },
              event: { select: { id: true, title: true, slug: true, venue: true, city: true, startDate: true } },
            },
          },
        },
      });

      // Reserve tickets by incrementing soldQty
      for (const item of cart.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldQty: { increment: item.quantity } },
        });
      }

      // Clear the cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    return order;
  }

  async createGuestOrder(dto: CreateGuestOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    const ticketTypes = await Promise.all(
      dto.items.map((item) =>
        this.prisma.ticketType.findUnique({
          where: { id: item.ticketTypeId },
          include: { event: { select: { id: true, title: true, slug: true, venue: true, city: true, startDate: true, status: true } } },
        }),
      ),
    );

    for (let i = 0; i < dto.items.length; i++) {
      const tt = ticketTypes[i];
      const item = dto.items[i];
      if (!tt) throw new BadRequestException('Ticket type not found');
      if (tt.event.status !== 'PUBLISHED') throw new BadRequestException(`Event "${tt.event.title}" is no longer available`);
      const available = tt.totalQty - tt.soldQty;
      if (item.quantity > available) throw new BadRequestException(`Only ${available} "${tt.name}" tickets available`);
      if (item.quantity > tt.maxPerOrder) throw new BadRequestException(`Maximum ${tt.maxPerOrder} "${tt.name}" tickets per order`);
    }

    const orderNumber = this.generateOrderNumber();
    const totalAmount = dto.items.reduce(
      (sum, item, i) => sum + Number(ticketTypes[i]!.price) * item.quantity, 0,
    );

    const order = await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < dto.items.length; i++) {
        const tt = await tx.ticketType.findUnique({ where: { id: dto.items[i].ticketTypeId } });
        if (!tt) throw new BadRequestException('Ticket type not found');
        const available = tt.totalQty - tt.soldQty;
        if (dto.items[i].quantity > available) throw new BadRequestException(`Only ${available} "${tt.name}" tickets left`);
      }

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: null,
          totalAmount,
          guestEmail: dto.guestEmail,
          guestName: dto.guestName,
          guestPhone: dto.guestPhone || null,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          items: {
            create: dto.items.map((item, i) => ({
              ticketTypeId: item.ticketTypeId,
              eventId: ticketTypes[i]!.event.id,
              quantity: item.quantity,
              unitPrice: ticketTypes[i]!.price,
              totalPrice: Number(ticketTypes[i]!.price) * item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              ticketType: { select: { name: true, price: true, currency: true } },
              event: { select: { id: true, title: true, slug: true, venue: true, city: true, startDate: true } },
            },
          },
        },
      });

      for (const item of dto.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldQty: { increment: item.quantity } },
        });
      }

      return newOrder;
    });

    return order;
  }

  async confirmGuestOrder(orderId: string, guestEmail: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, guestEmail, userId: null },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING) throw new BadRequestException('Order is not pending');

    const [updatedOrder] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMED, expiresAt: null },
        include: {
          items: {
            include: {
              ticketType: { select: { name: true, price: true, currency: true } },
              event: { select: { id: true, title: true, slug: true, venue: true, city: true, startDate: true } },
            },
          },
        },
      }),
      this.prisma.payment.create({
        data: { orderId, amount: order.totalAmount, status: 'SUCCESS' as any, provider: 'manual' },
      }),
    ]);

    return updatedOrder;
  }

  async confirmOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in pending status');
    }

    // For now (before Razorpay), simulate payment success
    const [updatedOrder] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMED, expiresAt: null },
        include: {
          items: {
            include: {
              ticketType: { select: { name: true, price: true, currency: true } },
              event: { select: { id: true, title: true, slug: true, venue: true, city: true, startDate: true } },
            },
          },
        },
      }),
      this.prisma.payment.create({
        data: {
          orderId,
          amount: order.totalAmount,
          status: PaymentStatus.SUCCESS,
          provider: 'manual',
        },
      }),
    ]);

    return updatedOrder;
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Order cannot be cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      // Release reserved tickets
      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldQty: { decrement: item.quantity } },
        });
      }
    });

    return { message: 'Order cancelled successfully' };
  }

  async getMyOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            ticketType: { select: { name: true, price: true, currency: true } },
            event: { select: { id: true, title: true, slug: true, venue: true, city: true, startDate: true, imageUrl: true } },
          },
        },
        payment: { select: { status: true, provider: true } },
      },
    });

    return orders;
  }

  async getOrderById(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: {
          include: {
            ticketType: { select: { name: true, price: true, currency: true, description: true } },
            event: { select: { id: true, title: true, slug: true, venue: true, address: true, city: true, state: true, startDate: true, endDate: true, imageUrl: true } },
          },
        },
        payment: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Check if expired
    if (order.status === OrderStatus.PENDING && order.expiresAt && new Date() > order.expiresAt) {
      await this.expireOrder(order.id, order.items);
      return { ...order, status: OrderStatus.EXPIRED };
    }

    return order;
  }

  private async expireOrder(orderId: string, items: { ticketTypeId: string; quantity: number }[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.EXPIRED },
      });

      for (const item of items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldQty: { decrement: item.quantity } },
        });
      }
    });
  }

  private generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TT-${dateStr}-${random}`;
  }
}
