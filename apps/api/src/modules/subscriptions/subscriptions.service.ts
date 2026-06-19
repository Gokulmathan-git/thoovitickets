import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionTier, SubscriptionStatus } from '@thoovitickets/database';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getActiveSubscription(userId: string) {
    const now = new Date();

    let sub = await this.prisma.orgSubscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });

    if (sub) return sub;

    const expired = await this.prisma.orgSubscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });

    if (expired) {
      await this.prisma.orgSubscription.update({
        where: { id: expired.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });

      if (expired.scheduledPlanId && expired.scheduledPlanTier) {
        this.logger.log(`Activating scheduled plan ${expired.scheduledPlanTier} for user ${userId}`);
        return this.createSubscriptionFromPlan(userId, expired.scheduledPlanTier);
      }
    }

    return this.createFreeSubscription(userId);
  }

  async subscribe(userId: string, tier: string, activateNow?: boolean) {
    const plan = await this.prisma.plan.findUnique({ where: { tier } });
    if (!plan || !plan.isActive) throw new BadRequestException('Invalid subscription plan');

    const current = await this.getActiveSubscription(userId);

    if (current.tier !== SubscriptionTier.FREE && current.endDate) {
      const daysLeft = Math.ceil((current.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (activateNow === false && daysLeft > 0) {
        await this.prisma.orgSubscription.update({
          where: { id: current.id },
          data: { scheduledPlanId: plan.id, scheduledPlanTier: tier },
        });

        return {
          message: `${plan.name} plan scheduled. It will activate after your current ${current.tier} plan ends on ${current.endDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })}.`,
          scheduled: true,
          activatesOn: current.endDate,
        };
      }

      if (activateNow !== true && daysLeft > 3) {
        throw new BadRequestException(
          `You have an active ${current.tier} plan with ${daysLeft} days remaining. Choose to activate the new plan now (no refund) or schedule it after your current plan ends.`,
        );
      }
    }

    await this.prisma.orgSubscription.updateMany({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.EXPIRED, endDate: new Date(), scheduledPlanId: null, scheduledPlanTier: null },
    });

    return this.createSubscriptionFromPlan(userId, tier);
  }

  async cancelScheduledPlan(userId: string) {
    const sub = await this.getActiveSubscription(userId);
    if (!sub.scheduledPlanId) throw new BadRequestException('No scheduled plan to cancel');

    await this.prisma.orgSubscription.update({
      where: { id: sub.id },
      data: { scheduledPlanId: null, scheduledPlanTier: null },
    });

    return { message: 'Scheduled plan change cancelled' };
  }

  async renewSubscription(userId: string) {
    const sub = await this.getActiveSubscription(userId);
    if (sub.tier === SubscriptionTier.FREE) throw new BadRequestException('Cannot renew free plan');
    if (!sub.endDate) throw new BadRequestException('This subscription does not expire');

    const daysLeft = Math.ceil((sub.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft > 7) throw new BadRequestException(`Too early to renew. Your plan expires in ${daysLeft} days. Renewal opens 7 days before expiry.`);

    const newEndDate = new Date(sub.endDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.orgSubscription.update({
      where: { id: sub.id },
      data: { endDate: newEndDate },
    });

    return { message: `Plan renewed until ${newEndDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })}` };
  }

  async cancelSubscription(userId: string) {
    const active = await this.prisma.orgSubscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });

    if (!active) throw new BadRequestException('No active subscription found');
    if (active.tier === SubscriptionTier.FREE) throw new BadRequestException('Cannot cancel free subscription');

    await this.prisma.orgSubscription.update({
      where: { id: active.id },
      data: { status: SubscriptionStatus.CANCELLED, endDate: new Date(), scheduledPlanId: null, scheduledPlanTier: null },
    });

    return this.createFreeSubscription(userId);
  }

  async checkEventLimit(userId: string) {
    const sub = await this.getActiveSubscription(userId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const eventCount = await this.prisma.event.count({
      where: { organiserId: userId, createdAt: { gte: startOfMonth } },
    });

    return {
      allowed: eventCount < sub.maxEvents,
      used: eventCount,
      max: sub.maxEvents,
      tier: sub.tier,
    };
  }

  async checkTicketLimit(userId: string) {
    const sub = await this.getActiveSubscription(userId);
    return sub.maxTickets;
  }

  async checkTicketTierLimit(userId: string) {
    const sub = await this.getActiveSubscription(userId);
    return sub.maxTicketTiers;
  }

  async getUsage(userId: string) {
    const sub = await this.getActiveSubscription(userId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [eventCount, staffCount] = await Promise.all([
      this.prisma.event.count({ where: { organiserId: userId, createdAt: { gte: startOfMonth } } }),
      this.prisma.staffAccount.count({ where: { organiserId: userId, isActive: true } }),
    ]);

    const daysRemaining = sub.endDate
      ? Math.max(0, Math.ceil((sub.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      events: { used: eventCount, max: sub.maxEvents },
      ticketTiers: { max: sub.maxTicketTiers },
      ticketsPerEvent: { max: sub.maxTickets },
      staff: { used: staffCount, max: sub.maxStaffAccounts },
      commission: Number(sub.commissionPercent),
      tier: sub.tier,
      expiresAt: sub.endDate || null,
      daysRemaining,
      isExpiringSoon: daysRemaining !== null && daysRemaining <= 7,
      canRenew: daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0,
      scheduledPlan: sub.scheduledPlanTier ? { tier: sub.scheduledPlanTier } : null,
    };
  }

  private async createSubscriptionFromPlan(userId: string, tier: string) {
    const plan = await this.prisma.plan.findUnique({ where: { tier } });
    if (!plan) return this.createFreeSubscription(userId);

    const startDate = new Date();
    const endDate = tier === 'FREE' ? null : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.orgSubscription.create({
      data: {
        userId,
        planId: plan.id,
        tier: tier as SubscriptionTier,
        status: SubscriptionStatus.ACTIVE,
        maxEvents: plan.maxEventsPerMonth,
        maxTickets: plan.maxTicketsPerEvent,
        maxTicketTiers: plan.maxTicketTiers,
        maxStaffAccounts: plan.maxStaffAccounts,
        commissionPercent: plan.commissionPercent,
        price: plan.price,
        startDate,
        endDate,
      },
      include: { plan: true },
    });
  }

  private async createFreeSubscription(userId: string) {
    const freePlan = await this.prisma.plan.findUnique({ where: { tier: 'FREE' } });

    return this.prisma.orgSubscription.create({
      data: {
        userId,
        planId: freePlan?.id || null,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        maxEvents: freePlan?.maxEventsPerMonth || 2,
        maxTickets: freePlan?.maxTicketsPerEvent || 300,
        maxTicketTiers: freePlan?.maxTicketTiers || 2,
        maxStaffAccounts: freePlan?.maxStaffAccounts || 1,
        commissionPercent: freePlan?.commissionPercent || 4.00,
        price: 0,
        startDate: new Date(),
      },
      include: { plan: true },
    });
  }
}
