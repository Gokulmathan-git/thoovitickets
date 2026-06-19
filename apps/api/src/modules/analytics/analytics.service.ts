import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, EventStatus, TicketStatus } from '@thoovitickets/database';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganiserDashboard(organiserId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      confirmedOrders,
      activeEventsCount,
      ticketStats,
      recentOrdersRaw,
      topEvents,
      subscription,
      eventsThisMonth,
      staffCount,
      monthlyRevenue,
      lastMonthRevenue,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { items: { some: { event: { organiserId } } }, status: OrderStatus.CONFIRMED },
        _sum: { orgPayout: true, totalAmount: true },
      }),
      this.prisma.event.count({ where: { organiserId, status: EventStatus.PUBLISHED } }),
      this.prisma.ticket.groupBy({
        by: ['status'],
        where: { order: { items: { some: { event: { organiserId } } } } },
        _count: true,
      }),
      this.prisma.order.findMany({
        where: { items: { some: { event: { organiserId } } }, status: OrderStatus.CONFIRMED },
        include: {
          user: { select: { firstName: true, lastName: true } },
          items: { include: { event: { select: { title: true } }, ticketType: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.event.findMany({
        where: { organiserId, status: { in: [EventStatus.PUBLISHED, EventStatus.COMPLETED as any] } },
        include: {
          ticketTypes: { select: { totalQty: true, soldQty: true } },
          orderItems: { where: { order: { status: OrderStatus.CONFIRMED } }, select: { totalPrice: true, quantity: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.orgSubscription.findFirst({
        where: { userId: organiserId, status: 'ACTIVE', OR: [{ endDate: null }, { endDate: { gte: now } }] },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.event.count({ where: { organiserId, createdAt: { gte: startOfMonth } } }),
      this.prisma.staffAccount.count({ where: { organiserId, isActive: true } }),
      this.prisma.order.aggregate({
        where: { items: { some: { event: { organiserId } } }, status: OrderStatus.CONFIRMED, createdAt: { gte: startOfMonth } },
        _sum: { orgPayout: true },
      }),
      this.prisma.order.aggregate({
        where: { items: { some: { event: { organiserId } } }, status: OrderStatus.CONFIRMED, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { orgPayout: true },
      }),
    ]);

    const totalTicketsSold = await this.prisma.orderItem.aggregate({
      where: { event: { organiserId }, order: { status: OrderStatus.CONFIRMED } },
      _sum: { quantity: true },
    });

    const usedTickets = ticketStats.find((t) => t.status === TicketStatus.USED)?._count || 0;
    const activeTickets = ticketStats.find((t) => t.status === TicketStatus.ACTIVE)?._count || 0;
    const totalCheckable = usedTickets + activeTickets;
    const checkInRate = totalCheckable > 0 ? Math.round((usedTickets / totalCheckable) * 100 * 10) / 10 : 0;

    return {
      summary: {
        totalRevenue: Number(confirmedOrders._sum.orgPayout || 0),
        totalTicketsSold: totalTicketsSold._sum.quantity || 0,
        activeEvents: activeEventsCount,
        checkInRate,
        revenueThisMonth: Number(monthlyRevenue._sum.orgPayout || 0),
        revenueLastMonth: Number(lastMonthRevenue._sum.orgPayout || 0),
      },
      activeEvents: topEvents.map((e) => {
        const revenue = e.orderItems.reduce((sum, oi) => sum + Number(oi.totalPrice), 0);
        const ticketsSold = e.orderItems.reduce((sum, oi) => sum + oi.quantity, 0);
        const totalCapacity = e.ticketTypes.reduce((sum, tt) => sum + tt.totalQty, 0);
        return {
          id: e.id, title: e.title, slug: e.slug, imageUrl: e.imageUrl, venue: e.venue,
          startDate: e.startDate, status: e.status, revenue, ticketsSold, totalCapacity,
        };
      }),
      recentOrders: recentOrdersRaw.map((o) => {
        const ticketCount = o.items.reduce((sum, i) => sum + i.quantity, 0);
        return {
          id: o.id, orderNumber: o.orderNumber,
          customerName: o.user ? `${o.user.firstName} ${o.user.lastName}` : (o.guestName || 'Guest'),
          customerInitial: (o.user?.firstName?.[0] || o.guestName?.[0] || 'G').toUpperCase(),
          eventTitle: o.items[0]?.event?.title || '',
          ticketCount,
          amount: Number(o.orgPayout),
          createdAt: o.createdAt,
        };
      }),
      subscription: {
        tier: subscription?.tier || 'FREE',
        eventsUsed: eventsThisMonth,
        eventsMax: subscription?.maxEvents || 2,
        staffUsed: staffCount,
        staffMax: subscription?.maxStaffAccounts || 1,
        commission: Number(subscription?.commissionPercent || 4),
        expiresAt: subscription?.endDate || null,
      },
      topSellingEvents: topEvents
        .map((e) => ({
          title: e.title,
          revenue: e.orderItems.reduce((sum, oi) => sum + Number(oi.totalPrice), 0),
          ticketsSold: e.orderItems.reduce((sum, oi) => sum + oi.quantity, 0),
        }))
        .sort((a, b) => b.revenue - a.revenue),
    };
  }

  async getOrganiserAnalytics(organiserId: string) {
    const events = await this.prisma.event.findMany({
      where: { organiserId },
      include: {
        ticketTypes: true,
        orderItems: {
          where: { order: { status: OrderStatus.CONFIRMED } },
          include: {
            order: { select: { status: true, createdAt: true } },
          },
        },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalRevenue = 0;
    let totalTicketsSold = 0;

    const eventAnalytics = events.map((event) => {
      const eventRevenue = event.orderItems.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0,
      );
      const eventTicketsSold = event.orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      const totalCapacity = event.ticketTypes.reduce(
        (sum, tt) => sum + tt.totalQty,
        0,
      );

      totalRevenue += eventRevenue;
      totalTicketsSold += eventTicketsSold;

      return {
        id: event.id,
        title: event.title,
        slug: event.slug,
        status: event.status,
        startDate: event.startDate,
        category: event.category.name,
        revenue: eventRevenue,
        ticketsSold: eventTicketsSold,
        totalCapacity,
        occupancyRate: totalCapacity > 0 ? Math.round((eventTicketsSold / totalCapacity) * 100) : 0,
        ticketBreakdown: event.ticketTypes.map((tt) => ({
          name: tt.name,
          price: Number(tt.price),
          totalQty: tt.totalQty,
          soldQty: tt.soldQty,
          revenue: Number(tt.price) * tt.soldQty,
        })),
      };
    });

    const recentOrders = await this.prisma.orderItem.findMany({
      where: {
        event: { organiserId },
        order: { status: OrderStatus.CONFIRMED },
      },
      include: {
        order: {
          select: { orderNumber: true, totalAmount: true, createdAt: true, user: { select: { firstName: true, lastName: true, email: true } } },
        },
        event: { select: { title: true } },
        ticketType: { select: { name: true } },
      },
      orderBy: { order: { createdAt: 'desc' } },
      take: 20,
    });

    return {
      summary: {
        totalEvents: events.length,
        publishedEvents: events.filter((e) => e.status === 'PUBLISHED').length,
        totalRevenue,
        totalTicketsSold,
      },
      events: eventAnalytics,
      recentOrders: recentOrders.map((item) => ({
        orderNumber: item.order.orderNumber,
        eventTitle: item.event.title,
        ticketType: item.ticketType.name,
        quantity: item.quantity,
        amount: Number(item.order.totalAmount),
        customerName: item.order.user ? `${item.order.user.firstName} ${item.order.user.lastName}` : 'Guest',
        customerEmail: item.order.user?.email || 'N/A',
        date: item.order.createdAt,
      })),
    };
  }
}
