import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import { TicketsService } from '../tickets/tickets.service';
import { DiscountsService } from '../discounts/discounts.service';
import { OrderStatus, PaymentStatus, Prisma } from '@thoovitickets/database';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { Logger } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly ticketsService: TicketsService,
    private readonly discountsService: DiscountsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createFromCart(userId: string, dto: CreateOrderDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            ticketType: {
              include: { event: { select: { id: true, title: true, status: true, organiserId: true } } },
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

    // Get organiser ID and event ID for commission calculation
    const organiserId = cart.items[0]?.ticketType.event.organiserId || undefined;
    const eventId = cart.items[0]?.ticketType.event.id || undefined;

    // Validate discount code if provided
    let discountInfo;
    if (dto.discountCode && eventId) {
      const ticketTypeIds = cart.items.map((item) => item.ticketTypeId);
      discountInfo = await this.discountsService.validateCode(dto.discountCode, eventId, ticketTypeIds);
    }

    // Calculate ALL amounts server-side from DB prices
    const pricing = await this.pricingService.calculatePriceBreakdown(
      cart.items.map((item) => ({ ticketTypeId: item.ticketTypeId, quantity: item.quantity })),
      organiserId,
      eventId,
      discountInfo,
    );

    const orderNumber = this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const [ticketType] = await tx.$queryRaw<any[]>`
          SELECT id, total_qty as "totalQty", sold_qty as "soldQty", name
          FROM ticket_types WHERE id = ${item.ticketTypeId} FOR UPDATE
        `;
        if (!ticketType) throw new BadRequestException('Ticket type not found');
        const available = ticketType.totalQty - ticketType.soldQty;
        if (item.quantity > available) throw new BadRequestException(`Only ${available} "${ticketType.name}" tickets left`);
      }

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subtotal: pricing.subtotal,
          discountId: pricing.discountId,
          discountCode: pricing.discountCode,
          discountAmount: pricing.discountAmount,
          platformFee: pricing.platformFee,
          platformFeePercent: 0,
          convenienceFee: 0,
          convenienceFeeType: pricing.platformFeeType,
          totalAmount: pricing.totalAmount,
          orgCommission: pricing.orgCommission,
          orgCommissionPercent: pricing.orgCommissionPercent,
          orgCommissionType: pricing.orgCommissionType,
          orgPayout: pricing.orgPayout,
          guestEmail: dto.guestEmail,
          guestName: dto.guestName,
          guestPhone: dto.guestPhone,
          attendeeData: (dto.attendees || []) as any,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
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

    // Increment discount usage after successful order creation
    if (pricing.discountId) {
      await this.discountsService.incrementUsage(pricing.discountId);
    }

    // Notify organiser about new order
    if (organiserId) {
      try {
        const eventTitle = cart.items[0]?.ticketType.event.title || 'your event';
        await this.notificationsService.create({
          userId: organiserId,
          type: 'NEW_ORDER',
          title: 'New Order Received',
          message: `New order #${orderNumber} (₹${pricing.totalAmount}) for "${eventTitle}"`,
          linkUrl: '/organiser/orders',
        });
      } catch { /* non-critical */ }
    }

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
          include: { event: { select: { id: true, title: true, slug: true, venue: true, city: true, startDate: true, status: true, organiserId: true } } },
        }),
      ),
    );

    for (let i = 0; i < dto.items.length; i++) {
      const tt = ticketTypes[i];
      const item = dto.items[i];
      if (!tt) throw new BadRequestException('Ticket type not found');
      if (tt.event.status !== 'PUBLISHED') throw new BadRequestException(`Event "${tt.event.title}" is no longer available`);
      if (new Date() > tt.event.startDate) throw new BadRequestException(`Event "${tt.event.title}" has already started`);
      const available = tt.totalQty - tt.soldQty;
      if (item.quantity > available) throw new BadRequestException(`Only ${available} "${tt.name}" tickets available`);
      if (item.quantity > tt.maxPerOrder) throw new BadRequestException(`Maximum ${tt.maxPerOrder} "${tt.name}" tickets per order`);

      const now = new Date();
      if (tt.saleStart && now < tt.saleStart) throw new BadRequestException(`Sales for "${tt.name}" have not started yet`);
      if (tt.saleEnd && now > tt.saleEnd) throw new BadRequestException(`Sales for "${tt.name}" have ended`);
    }

    // Validate all items are from the same event
    const eventIds = new Set(ticketTypes.filter(Boolean).map((tt) => tt!.event.id));
    if (eventIds.size > 1) {
      throw new BadRequestException('All tickets must be from the same event');
    }

    const organiserId = ticketTypes[0]?.event.organiserId || undefined;
    const eventId = ticketTypes[0]?.event.id || undefined;

    // Validate discount code if provided
    let discountInfo;
    if (dto.discountCode && eventId) {
      const ticketTypeIds = dto.items.map((item) => item.ticketTypeId);
      discountInfo = await this.discountsService.validateCode(dto.discountCode, eventId, ticketTypeIds);
    }

    const pricing = await this.pricingService.calculatePriceBreakdown(
      dto.items.map((item) => ({ ticketTypeId: item.ticketTypeId, quantity: item.quantity })),
      organiserId,
      eventId,
      discountInfo,
    );

    const orderNumber = this.generateOrderNumber();

    const order = await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < dto.items.length; i++) {
        const [tt] = await tx.$queryRaw<any[]>`
          SELECT id, total_qty as "totalQty", sold_qty as "soldQty", name
          FROM ticket_types WHERE id = ${dto.items[i].ticketTypeId} FOR UPDATE
        `;
        if (!tt) throw new BadRequestException('Ticket type not found');
        const available = tt.totalQty - tt.soldQty;
        if (dto.items[i].quantity > available) throw new BadRequestException(`Only ${available} "${tt.name}" tickets left`);
      }

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: null,
          subtotal: pricing.subtotal,
          discountId: pricing.discountId,
          discountCode: pricing.discountCode,
          discountAmount: pricing.discountAmount,
          platformFee: pricing.platformFee,
          platformFeePercent: 0,
          convenienceFee: 0,
          convenienceFeeType: pricing.platformFeeType,
          totalAmount: pricing.totalAmount,
          orgCommission: pricing.orgCommission,
          orgCommissionPercent: pricing.orgCommissionPercent,
          orgCommissionType: pricing.orgCommissionType,
          orgPayout: pricing.orgPayout,
          guestEmail: dto.guestEmail,
          guestName: dto.guestName,
          guestPhone: dto.guestPhone || null,
          attendeeData: (dto.attendees || []) as any,
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

    // Increment discount usage after successful order creation
    if (pricing.discountId) {
      await this.discountsService.incrementUsage(pricing.discountId);
    }

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

    this.generateTicketsAsync(orderId);

    return updatedOrder;
  }

  private generateTicketsAsync(orderId: string) {
    (async () => {
      try {
        await this.ticketsService.generateTicketsForOrder(orderId);
        await this.ticketsService.generateAndStoreInvoice(orderId);
        await this.ticketsService.sendTicketEmail(orderId);
      } catch (error) {
        this.logger.error(`Failed to generate tickets for order ${orderId}`, error);
      }
    })();
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

    this.generateTicketsAsync(orderId);

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

    await this._cancelOrderTransaction(order);
    return { message: 'Order cancelled successfully' };
  }

  async cancelGuestOrder(orderId: string, guestEmail: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, guestEmail, userId: null },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order cannot be cancelled');
    }

    await this._cancelOrderTransaction(order);
    return { message: 'Order cancelled successfully' };
  }

  private async _cancelOrderTransaction(order: { id: string; items: { ticketTypeId: string; quantity: number }[] }) {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.ticket.updateMany({
        where: { orderItem: { orderId: order.id } },
        data: { status: 'CANCELLED' },
      });

      for (const item of order.items) {
        await tx.ticketType.update({
          where: { id: item.ticketTypeId },
          data: { soldQty: { decrement: item.quantity } },
        });
      }
    });
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

  // ─── ORGANISER METHODS ─────────────────────────────

  async getOrganiserOrders(
    userId: string,
    query: { eventId?: string; status?: string; page?: number; limit?: number },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Find all events belonging to this organiser
    const organiserEvents = await this.prisma.event.findMany({
      where: { organiserId: userId },
      select: { id: true },
    });

    const eventIds = organiserEvents.map((e) => e.id);
    if (eventIds.length === 0) {
      return { orders: [], total: 0, page, limit, totalPages: 0 };
    }

    const where: Prisma.OrderWhereInput = {
      items: {
        some: {
          eventId: query.eventId ? query.eventId : { in: eventIds },
        },
      },
    };

    // If filtering by a specific event, verify it belongs to the organiser
    if (query.eventId && !eventIds.includes(query.eventId)) {
      throw new ForbiddenException('Event does not belong to you');
    }

    if (query.status) {
      where.status = query.status as OrderStatus;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              ticketType: { select: { name: true, price: true, currency: true } },
              event: { select: { id: true, title: true, slug: true, venue: true, city: true, startDate: true } },
            },
          },
          payment: { select: { status: true, provider: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((order) => ({
        ...order,
        attendeeData: order.attendeeData,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrganiserOrderDetail(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            ticketType: { select: { name: true, price: true, currency: true, description: true } },
            event: { select: { id: true, title: true, slug: true, venue: true, address: true, city: true, state: true, startDate: true, endDate: true, imageUrl: true, organiserId: true } },
          },
        },
        payment: true,
        tickets: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Verify the order belongs to one of the organiser's events
    const belongsToOrganiser = order.items.some(
      (item) => (item.event as any).organiserId === userId,
    );
    if (!belongsToOrganiser) {
      throw new ForbiddenException('This order does not belong to your events');
    }

    return order;
  }

  async getEventAttendees(userId: string, eventId: string) {
    // Verify the event belongs to the organiser
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, organiserId: true },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== userId) {
      throw new ForbiddenException('This event does not belong to you');
    }

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { orderItem: { eventId } },
        select: {
          id: true,
          attendeeName: true,
          attendeeEmail: true,
          attendeePhone: true,
          ticketCode: true,
          qrDataUrl: true,
          status: true,
          checkedInAt: true,
          orderItem: {
            select: {
              ticketType: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      }),
      this.prisma.ticket.count({ where: { orderItem: { eventId } } }),
    ]);

    return {
      event: { id: event.id, title: event.title },
      attendees: tickets.map((t) => ({
        id: t.id,
        attendeeName: t.attendeeName,
        attendeeEmail: t.attendeeEmail,
        attendeePhone: t.attendeePhone,
        ticketCode: t.ticketCode,
        qrDataUrl: t.qrDataUrl,
        status: t.status,
        checkedInAt: t.checkedInAt,
        ticketTypeName: t.orderItem.ticketType.name,
      })),
      total,
    };
  }

  // ─── ADMIN METHODS ─────────────────────────────

  async getAdminOrders(query: {
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status as OrderStatus;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              ticketType: { select: { name: true, price: true, currency: true } },
              event: { select: { id: true, title: true, slug: true, venue: true, city: true, startDate: true } },
            },
          },
          payment: { select: { status: true, provider: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAdminOrderDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            ticketType: { select: { name: true, price: true, currency: true, description: true } },
            event: {
              select: {
                id: true, title: true, slug: true, venue: true, address: true,
                city: true, state: true, startDate: true, endDate: true, imageUrl: true,
                organiser: { select: { id: true, firstName: true, lastName: true, orgName: true, email: true } },
              },
            },
          },
        },
        payment: true,
        tickets: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
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
