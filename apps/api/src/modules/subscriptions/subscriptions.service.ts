import { Injectable, Inject, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionTier, SubscriptionStatus, PaymentStatus } from '@thoovitickets/database';
import { PaymentProvider, PAYMENT_PROVIDER } from '../payments/providers/payment-provider.interface';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

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

  async initiateSubscriptionPayment(userId: string, tier: string, activateNow?: boolean) {
    const plan = await this.prisma.plan.findUnique({ where: { tier } });
    if (!plan || !plan.isActive) throw new BadRequestException('Invalid subscription plan');

    const planPrice = Number(plan.price);
    if (planPrice <= 0) throw new BadRequestException('Free plan does not require payment');

    const current = await this.getActiveSubscription(userId);

    if (current.tier !== SubscriptionTier.FREE && current.endDate) {
      const daysLeft = Math.ceil((current.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (activateNow === false && daysLeft > 0) {
        await this.prisma.orgSubscription.update({
          where: { id: current.id },
          data: { scheduledPlanId: plan.id, scheduledPlanTier: tier },
        });

        return {
          scheduled: true,
          message: `${plan.name} plan scheduled. It will activate after your current ${current.tier} plan ends on ${current.endDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })}.`,
          activatesOn: current.endDate,
        };
      }

      if (activateNow !== true && daysLeft > 3) {
        throw new BadRequestException(
          `You have an active ${current.tier} plan with ${daysLeft} days remaining. Choose to activate the new plan now (no refund) or schedule it after your current plan ends.`,
        );
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true, phone: true },
    });

    const result = await this.paymentProvider.createOrder({
      orderId: `sub_${userId}_${tier}_${Date.now()}`,
      amount: planPrice,
      currency: 'INR',
      customerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      customerEmail: user?.email || '',
      customerPhone: user?.phone || undefined,
      description: `${plan.name} Plan Subscription - ₹${planPrice}/month`,
    });

    await this.prisma.subscriptionPayment.create({
      data: {
        userId,
        planId: plan.id,
        tier,
        amount: planPrice,
        currency: 'INR',
        provider: result.provider,
        providerOrderId: result.providerOrderId,
        status: PaymentStatus.PENDING,
        activateNow: activateNow !== false,
      },
    });

    return {
      scheduled: false,
      providerOrderId: result.providerOrderId,
      amount: planPrice,
      currency: 'INR',
      provider: result.provider,
      keyId: result.keyId,
      planName: plan.name,
      tier: plan.tier,
      prefill: {
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        email: user?.email || '',
        contact: user?.phone || '',
      },
    };
  }

  async verifySubscriptionPayment(
    userId: string,
    providerPaymentId: string,
    providerOrderId: string,
    providerSignature: string,
  ) {
    const subPayment = await this.prisma.subscriptionPayment.findFirst({
      where: { providerOrderId, userId },
      include: { plan: true },
    });

    if (!subPayment) throw new NotFoundException('Subscription payment not found');
    if (subPayment.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Payment already verified');
    }

    const verification = await this.paymentProvider.verifyPayment({
      providerOrderId,
      providerPaymentId,
      providerSignature,
    });

    if (!verification.verified) {
      await this.prisma.subscriptionPayment.update({
        where: { id: subPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          providerPaymentId,
          failureReason: 'Signature verification failed',
        },
      });
      throw new BadRequestException('Payment verification failed');
    }

    await this.prisma.subscriptionPayment.update({
      where: { id: subPayment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        providerPaymentId,
        metadata: { signature: providerSignature },
      },
    });

    if (subPayment.activateNow) {
      await this.prisma.orgSubscription.updateMany({
        where: { userId, status: SubscriptionStatus.ACTIVE },
        data: { status: SubscriptionStatus.EXPIRED, endDate: new Date(), scheduledPlanId: null, scheduledPlanTier: null },
      });

      const newSub = await this.createSubscriptionFromPlan(userId, subPayment.tier);

      return {
        message: `${subPayment.plan.name} plan activated successfully!`,
        subscription: newSub,
        paymentStatus: 'SUCCESS',
      };
    } else {
      const current = await this.getActiveSubscription(userId);
      await this.prisma.orgSubscription.update({
        where: { id: current.id },
        data: { scheduledPlanId: subPayment.planId, scheduledPlanTier: subPayment.tier },
      });

      return {
        message: `${subPayment.plan.name} plan scheduled after current plan ends.`,
        scheduled: true,
        paymentStatus: 'SUCCESS',
      };
    }
  }

  async subscribe(userId: string, tier: string, activateNow?: boolean) {
    const plan = await this.prisma.plan.findUnique({ where: { tier } });
    if (!plan || !plan.isActive) throw new BadRequestException('Invalid subscription plan');

    if (Number(plan.price) > 0) {
      throw new BadRequestException('Paid plans require payment. Use the payment flow instead.');
    }

    const current = await this.getActiveSubscription(userId);

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

    const plan = await this.prisma.plan.findUnique({ where: { tier: sub.tier } });
    if (!plan) throw new BadRequestException('Plan not found');

    const planPrice = Number(plan.price);
    if (planPrice <= 0) throw new BadRequestException('Cannot renew a free plan');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true, phone: true },
    });

    const result = await this.paymentProvider.createOrder({
      orderId: `renew_${userId}_${sub.tier}_${Date.now()}`,
      amount: planPrice,
      currency: 'INR',
      customerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
      customerEmail: user?.email || '',
      customerPhone: user?.phone || undefined,
      description: `${plan.name} Plan Renewal - ₹${planPrice}/month`,
    });

    await this.prisma.subscriptionPayment.create({
      data: {
        userId,
        planId: plan.id,
        tier: sub.tier,
        amount: planPrice,
        currency: 'INR',
        provider: result.provider,
        providerOrderId: result.providerOrderId,
        status: PaymentStatus.PENDING,
        activateNow: true,
        metadata: { type: 'renewal', subscriptionId: sub.id },
      },
    });

    return {
      providerOrderId: result.providerOrderId,
      amount: planPrice,
      currency: 'INR',
      provider: result.provider,
      keyId: result.keyId,
      planName: plan.name,
      tier: sub.tier,
      isRenewal: true,
      prefill: {
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        email: user?.email || '',
        contact: user?.phone || '',
      },
    };
  }

  async verifyRenewalPayment(
    userId: string,
    providerPaymentId: string,
    providerOrderId: string,
    providerSignature: string,
  ) {
    const subPayment = await this.prisma.subscriptionPayment.findFirst({
      where: { providerOrderId, userId },
      include: { plan: true },
    });

    if (!subPayment) throw new NotFoundException('Renewal payment not found');
    if (subPayment.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Payment already verified');
    }

    const verification = await this.paymentProvider.verifyPayment({
      providerOrderId,
      providerPaymentId,
      providerSignature,
    });

    if (!verification.verified) {
      await this.prisma.subscriptionPayment.update({
        where: { id: subPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          providerPaymentId,
          failureReason: 'Signature verification failed',
        },
      });
      throw new BadRequestException('Payment verification failed');
    }

    await this.prisma.subscriptionPayment.update({
      where: { id: subPayment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        providerPaymentId,
        metadata: { signature: providerSignature, type: 'renewal' },
      },
    });

    const sub = await this.getActiveSubscription(userId);
    const newEndDate = new Date((sub.endDate || new Date()).getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.orgSubscription.update({
      where: { id: sub.id },
      data: { endDate: newEndDate },
    });

    return {
      message: `Plan renewed until ${newEndDate.toLocaleDateString('en-IN', { dateStyle: 'medium' })}`,
      paymentStatus: 'SUCCESS',
    };
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
