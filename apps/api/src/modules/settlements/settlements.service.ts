import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettlementStatus, Prisma } from '@thoovitickets/database';
import { NotificationsService } from '../notifications/notifications.service';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

@Injectable()
export class SettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getOrganiserSummary(organiserId: string) {
    // Get all events belonging to the organiser
    const events = await this.prisma.event.findMany({
      where: { organiserId },
      select: { id: true, title: true, slug: true, startDate: true, endDate: true, status: true },
    });

    const eventIds = events.map((e) => e.id);

    // Get all confirmed orders that have items for organiser's events
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'CONFIRMED',
        items: {
          some: { eventId: { in: eventIds } },
        },
      },
      select: {
        subtotal: true,
        platformFee: true,
        orgCommission: true,
        orgPayout: true,
        items: {
          select: { eventId: true },
        },
      },
    });

    let totalRevenue = new Decimal(0);
    let totalPlatformFee = new Decimal(0);
    let totalCommission = new Decimal(0);
    let totalPayout = new Decimal(0);

    for (const order of orders) {
      totalRevenue = totalRevenue.add(order.subtotal);
      totalPlatformFee = totalPlatformFee.add(order.platformFee);
      totalCommission = totalCommission.add(order.orgCommission);
      totalPayout = totalPayout.add(order.orgPayout);
    }

    // Get total settled amount
    const settledAgg = await this.prisma.settlement.aggregate({
      where: {
        organiserId,
        status: 'COMPLETED',
      },
      _sum: { netPayout: true },
    });

    const totalSettled = settledAgg._sum.netPayout ?? new Decimal(0);
    const pendingSettlement = totalPayout.sub(totalSettled);

    // Breakdown by event
    const eventBreakdown = await Promise.all(
      events.map(async (event) => {
        const eventOrders = await this.prisma.order.findMany({
          where: {
            status: 'CONFIRMED',
            items: { some: { eventId: event.id } },
          },
          select: {
            subtotal: true,
            platformFee: true,
            orgCommission: true,
            orgPayout: true,
          },
        });

        let evtRevenue = new Decimal(0);
        let evtPlatformFee = new Decimal(0);
        let evtCommission = new Decimal(0);
        let evtPayout = new Decimal(0);

        for (const o of eventOrders) {
          evtRevenue = evtRevenue.add(o.subtotal);
          evtPlatformFee = evtPlatformFee.add(o.platformFee);
          evtCommission = evtCommission.add(o.orgCommission);
          evtPayout = evtPayout.add(o.orgPayout);
        }

        const evtSettled = await this.prisma.settlement.aggregate({
          where: { eventId: event.id, status: 'COMPLETED' },
          _sum: { netPayout: true },
        });

        const settledAmount = evtSettled._sum.netPayout ?? new Decimal(0);

        return {
          eventId: event.id,
          title: event.title,
          slug: event.slug,
          startDate: event.startDate,
          endDate: event.endDate,
          status: event.status,
          totalOrders: eventOrders.length,
          revenue: evtRevenue,
          platformFee: evtPlatformFee,
          commission: evtCommission,
          payout: evtPayout,
          settled: settledAmount,
          available: evtPayout.sub(settledAmount),
        };
      }),
    );

    return {
      totalRevenue,
      totalPlatformFee,
      totalCommission,
      totalPayout,
      totalSettled,
      pendingSettlement,
      events: eventBreakdown,
    };
  }

  async getEventSettlementDetail(organiserId: string, eventId: string) {
    // Verify event belongs to organiser
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organiserId },
      select: { id: true, title: true, slug: true, startDate: true, endDate: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found or does not belong to you');
    }

    // Get order stats
    const allOrders = await this.prisma.order.findMany({
      where: {
        items: { some: { eventId } },
      },
      select: {
        id: true,
        status: true,
        subtotal: true,
        platformFee: true,
        orgCommission: true,
        orgPayout: true,
      },
    });

    const confirmedOrders = allOrders.filter((o) => o.status === 'CONFIRMED');

    let totalRevenue = new Decimal(0);
    let totalPlatformFee = new Decimal(0);
    let totalCommission = new Decimal(0);
    let netPayout = new Decimal(0);

    for (const o of confirmedOrders) {
      totalRevenue = totalRevenue.add(o.subtotal);
      totalPlatformFee = totalPlatformFee.add(o.platformFee);
      totalCommission = totalCommission.add(o.orgCommission);
      netPayout = netPayout.add(o.orgPayout);
    }

    // Settlement history for this event
    const settlements = await this.prisma.settlement.findMany({
      where: { eventId, organiserId },
      orderBy: { createdAt: 'desc' },
    });

    const settledAmount = settlements
      .filter((s) => s.status === 'COMPLETED')
      .reduce((sum, s) => sum.add(s.netPayout), new Decimal(0));

    const availableForSettlement = netPayout.sub(settledAmount);

    return {
      event,
      totalOrders: allOrders.length,
      confirmedOrders: confirmedOrders.length,
      totalRevenue,
      totalPlatformFee,
      totalCommission,
      netPayout,
      settledAmount,
      availableForSettlement,
      settlements,
    };
  }

  async requestSettlement(organiserId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organiserId },
      select: { id: true, title: true, organiserId: true, endDate: true, status: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found or does not belong to you');
    }

    // Event must have ended
    if (new Date() < event.endDate) {
      throw new BadRequestException(
        `Settlement can only be requested after the event ends. Event ends on ${event.endDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })}.`,
      );
    }

    // Plan-based cooldown after event end
    const sub = await this.prisma.orgSubscription.findFirst({
      where: { userId: organiserId, status: 'ACTIVE', OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
      orderBy: { createdAt: 'desc' },
    });
    const tier = sub?.tier || 'FREE';
    let cooldownHours = 48; // FREE plan: 2 days
    if (tier === 'PRO') cooldownHours = 24;
    else if (tier === 'ADVANCE') cooldownHours = 24;
    else if (tier === 'ENTERPRISE') cooldownHours = 2;

    const cooldownEnd = new Date(event.endDate.getTime() + cooldownHours * 60 * 60 * 1000);
    if (new Date() < cooldownEnd) {
      const hoursLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60));
      throw new BadRequestException(
        `Settlement available after ${cooldownEnd.toLocaleDateString('en-IN', { dateStyle: 'medium' })} at ${cooldownEnd.toLocaleTimeString('en-IN', { timeStyle: 'short' })} (${hoursLeft}h remaining). ${tier === 'FREE' ? 'Free plan: 48h after event end.' : `${tier} plan: 24h after event end.`}`,
      );
    }

    // Check for existing pending/requested/processing settlement
    const existing = await this.prisma.settlement.findFirst({
      where: {
        eventId,
        organiserId,
        status: { in: ['PENDING', 'REQUESTED', 'PROCESSING'] },
      },
    });

    if (existing) {
      throw new ConflictException(
        'A settlement request is already pending for this event',
      );
    }

    // Calculate available amount
    const confirmedOrders = await this.prisma.order.findMany({
      where: {
        status: 'CONFIRMED',
        items: { some: { eventId } },
      },
      select: {
        subtotal: true,
        platformFee: true,
        orgCommission: true,
        orgPayout: true,
      },
    });

    let totalRevenue = new Decimal(0);
    let totalPlatformFee = new Decimal(0);
    let totalCommission = new Decimal(0);
    let totalPayout = new Decimal(0);

    for (const o of confirmedOrders) {
      totalRevenue = totalRevenue.add(o.subtotal);
      totalPlatformFee = totalPlatformFee.add(o.platformFee);
      totalCommission = totalCommission.add(o.orgCommission);
      totalPayout = totalPayout.add(o.orgPayout);
    }

    const settledAgg = await this.prisma.settlement.aggregate({
      where: { eventId, organiserId, status: 'COMPLETED' },
      _sum: { netPayout: true },
    });

    const alreadySettled = settledAgg._sum.netPayout ?? new Decimal(0);
    const availableAmount = totalPayout.sub(alreadySettled);

    if (availableAmount.lte(0)) {
      throw new BadRequestException(
        'No available amount for settlement',
      );
    }

    const settlement = await this.prisma.settlement.create({
      data: {
        amount: totalRevenue,
        platformFee: totalPlatformFee,
        commission: totalCommission,
        netPayout: availableAmount,
        status: 'REQUESTED',
        requestedAt: new Date(),
        organiserId,
        eventId,
      },
    });

    // Notify admins about new settlement request
    try {
      await this.notificationsService.createForAdmins({
        type: 'NEW_SETTLEMENT_REQUEST',
        title: 'New Settlement Request',
        message: `Settlement of ₹${Number(availableAmount).toFixed(2)} requested for "${event.title}"`,
        linkUrl: `/admin/settlements`,
      });
    } catch { /* non-critical */ }

    return settlement;
  }

  async getMySettlements(organiserId: string) {
    const settlements = await this.prisma.settlement.findMany({
      where: { organiserId },
      include: {
        event: {
          select: { id: true, title: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return settlements;
  }

  async getAllSettlements(status?: SettlementStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const settlements = await this.prisma.settlement.findMany({
      where,
      include: {
        organiser: {
          select: { id: true, firstName: true, lastName: true, orgName: true, email: true },
        },
        event: {
          select: { id: true, title: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return settlements;
  }

  async getSettlementById(settlementId: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        organiser: {
          select: { id: true, firstName: true, lastName: true, orgName: true, email: true },
        },
        event: {
          select: { id: true, title: true, slug: true },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    return settlement;
  }

  async processSettlement(
    settlementId: string,
    action: 'approve' | 'reject',
    data: { transactionRef?: string; rejectionReason?: string },
  ) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new NotFoundException('Settlement not found');
    }

    if (!['REQUESTED', 'PENDING', 'PROCESSING'].includes(settlement.status)) {
      throw new BadRequestException(
        `Cannot process settlement with status ${settlement.status}`,
      );
    }

    if (action === 'approve') {
      const updated = await this.prisma.settlement.update({
        where: { id: settlementId },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          transactionRef: data.transactionRef ?? null,
        },
        include: {
          organiser: { select: { id: true, firstName: true, lastName: true, orgName: true, email: true } },
          event: { select: { id: true, title: true } },
        },
      });

      try {
        await this.notificationsService.create({
          userId: settlement.organiserId,
          type: 'SETTLEMENT_COMPLETED',
          title: 'Settlement Completed',
          message: `Your settlement of ₹${Number(settlement.netPayout).toFixed(2)} has been processed.${data.transactionRef ? ` Ref: ${data.transactionRef}` : ''}`,
          linkUrl: '/organiser/settlements',
        });
      } catch { /* non-critical */ }

      return updated;
    } else {
      const updated = await this.prisma.settlement.update({
        where: { id: settlementId },
        data: {
          status: 'REJECTED',
          rejectedAt: new Date(),
          rejectionReason: data.rejectionReason ?? null,
        },
        include: {
          organiser: { select: { id: true, firstName: true, lastName: true, orgName: true, email: true } },
          event: { select: { id: true, title: true } },
        },
      });

      try {
        await this.notificationsService.create({
          userId: settlement.organiserId,
          type: 'SETTLEMENT_REJECTED',
          title: 'Settlement Rejected',
          message: `Your settlement request was rejected.${data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ''}`,
          linkUrl: '/organiser/settlements',
        });
      } catch { /* non-critical */ }

      return updated;
    }
  }
}
