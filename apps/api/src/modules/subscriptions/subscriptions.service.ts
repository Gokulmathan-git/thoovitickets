import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionTier, SubscriptionStatus } from '@thoovitickets/database';
import { SUBSCRIPTION_PLANS, PlanTier } from './subscription-plans';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  getPlans() {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  async getActiveSubscription(userId: string) {
    const sub = await this.prisma.orgSubscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      return this.createFreeSubscription(userId);
    }

    return sub;
  }

  async subscribe(userId: string, tier: PlanTier) {
    const plan = SUBSCRIPTION_PLANS[tier];
    if (!plan) throw new BadRequestException('Invalid subscription tier');

    // Expire any existing active subscription
    await this.prisma.orgSubscription.updateMany({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.EXPIRED, endDate: new Date() },
    });

    const startDate = new Date();
    const endDate = tier === 'FREE' ? null : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const subscription = await this.prisma.orgSubscription.create({
      data: {
        userId,
        tier: tier as SubscriptionTier,
        status: SubscriptionStatus.ACTIVE,
        maxEvents: plan.maxEvents,
        maxTickets: plan.maxTickets,
        price: plan.price,
        startDate,
        endDate,
      },
    });

    return subscription;
  }

  async cancelSubscription(userId: string) {
    const active = await this.prisma.orgSubscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });

    if (!active) throw new BadRequestException('No active subscription found');
    if (active.tier === SubscriptionTier.FREE) {
      throw new BadRequestException('Cannot cancel free subscription');
    }

    await this.prisma.orgSubscription.update({
      where: { id: active.id },
      data: { status: SubscriptionStatus.CANCELLED, endDate: new Date() },
    });

    // Auto-create free subscription
    return this.createFreeSubscription(userId);
  }

  async checkEventLimit(userId: string): Promise<{ allowed: boolean; used: number; max: number; tier: string }> {
    const sub = await this.getActiveSubscription(userId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const eventCount = await this.prisma.event.count({
      where: {
        organiserId: userId,
        createdAt: { gte: startOfMonth },
      },
    });

    return {
      allowed: eventCount < sub.maxEvents,
      used: eventCount,
      max: sub.maxEvents,
      tier: sub.tier,
    };
  }

  async checkTicketLimit(userId: string): Promise<number> {
    const sub = await this.getActiveSubscription(userId);
    return sub.maxTickets;
  }

  private async createFreeSubscription(userId: string) {
    const plan = SUBSCRIPTION_PLANS.FREE;
    return this.prisma.orgSubscription.create({
      data: {
        userId,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        maxEvents: plan.maxEvents,
        maxTickets: plan.maxTickets,
        price: 0,
        startDate: new Date(),
      },
    });
  }
}
