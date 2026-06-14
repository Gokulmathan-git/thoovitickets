import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@thoovitickets/database';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

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
