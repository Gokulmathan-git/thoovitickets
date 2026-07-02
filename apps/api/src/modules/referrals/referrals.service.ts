import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReferralStatus, EventStatus, OrderStatus, Prisma } from '@thoovitickets/database';
import * as crypto from 'crypto';

const FIRST_REFERRAL_POINTS = 499;
const SUBSEQUENT_REFERRAL_POINTS = 249;
const MILESTONE_COUNT = 10;
const GROSS_SALES_THRESHOLD = 50000;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(private readonly prisma: PrismaService) {}

  generateReferralCode(firstName: string): string {
    const prefix = 'THVI';
    const namePart = firstName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5);
    const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${prefix}-${namePart}${randomPart}`;
  }

  async ensureReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, firstName: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.referralCode) return user.referralCode;

    let code: string;
    let attempts = 0;
    do {
      code = this.generateReferralCode(user.firstName);
      const exists = await this.prisma.user.findUnique({ where: { referralCode: code } });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });
    return code;
  }

  async getOrCreateWallet(userId: string) {
    let wallet = await this.prisma.thoviPointsWallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      wallet = await this.prisma.thoviPointsWallet.create({
        data: { userId, balance: 0, totalEarned: 0, totalSpent: 0 },
      });
    }
    return wallet;
  }

  async trackReferral(referrerId: string, referredId: string, referralCode: string) {
    if (referrerId === referredId) {
      this.logger.warn(`Self-referral attempt blocked: ${referrerId}`);
      return null;
    }

    const existing = await this.prisma.referral.findUnique({
      where: { referrerId_referredId: { referrerId, referredId } },
    });
    if (existing) return existing;

    return this.prisma.referral.create({
      data: {
        referralCode,
        referrerId,
        referredId,
        status: 'PENDING',
      },
    });
  }

  async checkAndQualifyReferral(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        status: true,
        organiserId: true,
        organiser: { select: { referredByUserId: true } },
      },
    });

    if (!event || event.status !== EventStatus.COMPLETED) return;
    if (!event.organiser.referredByUserId) return;

    const referral = await this.prisma.referral.findFirst({
      where: {
        referredId: event.organiserId,
        referrerId: event.organiser.referredByUserId,
        status: 'PENDING',
      },
    });

    if (!referral) return;

    const grossSales = await this.prisma.order.aggregate({
      where: {
        items: { some: { eventId } },
        status: OrderStatus.CONFIRMED,
      },
      _sum: { totalAmount: true },
    });

    const totalSales = Number(grossSales._sum.totalAmount || 0);
    if (totalSales < GROSS_SALES_THRESHOLD) return;

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'QUALIFIED',
        qualifyingEventId: eventId,
        grossTicketSales: totalSales,
        qualifiedAt: new Date(),
      },
    });

    this.logger.log(`Referral ${referral.id} qualified with ₹${totalSales} gross sales`);
    await this.processReferralReward(referral.id);
  }

  async processReferralReward(referralId: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id: referralId },
      include: { referrer: { select: { id: true, firstName: true } } },
    });
    if (!referral || referral.status !== 'QUALIFIED') return;

    const completedCount = await this.prisma.referral.count({
      where: { referrerId: referral.referrerId, status: 'REWARDED' },
    });

    const referralNumber = completedCount + 1;
    const points = referralNumber === 1 ? FIRST_REFERRAL_POINTS : SUBSEQUENT_REFERRAL_POINTS;

    const wallet = await this.getOrCreateWallet(referral.referrerId);
    const newBalance = wallet.balance + points;

    await this.prisma.$transaction([
      this.prisma.thoviPointsWallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          totalEarned: wallet.totalEarned + points,
        },
      }),
      this.prisma.pointsTransaction.create({
        data: {
          type: 'REFERRAL_REWARD',
          points,
          balance: newBalance,
          description: `Referral reward #${referralNumber} — ${points} Thoovi Points`,
          walletId: wallet.id,
          referralId: referral.id,
        },
      }),
      this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'REWARDED',
          rewardPoints: points,
          referralNumber,
          rewardedAt: new Date(),
        },
      }),
    ]);

    this.logger.log(`Rewarded ${points} Thoovi Points to user ${referral.referrerId} (referral #${referralNumber})`);

    if (referralNumber === MILESTONE_COUNT) {
      await this.grantMilestoneProPlan(referral.referrerId);
    }
  }

  async grantMilestoneProPlan(userId: string) {
    const proPlan = await this.prisma.plan.findFirst({
      where: { tier: 'PRO', isActive: true },
    });
    if (!proPlan) {
      this.logger.warn('No active PRO plan found for milestone reward');
      return;
    }

    const existingActive = await this.prisma.orgSubscription.findFirst({
      where: { userId, status: 'ACTIVE', tier: 'PRO' },
    });
    if (existingActive) {
      this.logger.log(`User ${userId} already has active PRO plan, skipping milestone`);
      return;
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);

    await this.prisma.orgSubscription.create({
      data: {
        tier: 'PRO',
        status: 'ACTIVE',
        maxEvents: proPlan.maxEventsPerMonth,
        maxTickets: proPlan.maxTicketsPerEvent,
        maxTicketTiers: proPlan.maxTicketTiers,
        maxStaffAccounts: proPlan.maxStaffAccounts,
        commissionPercent: 2.0,
        commissionType: 'PERCENTAGE',
        price: 0,
        billingCycle: 'REFERRAL_MILESTONE',
        startDate: now,
        endDate,
        userId,
        planId: proPlan.id,
      },
    });

    const wallet = await this.getOrCreateWallet(userId);
    await this.prisma.pointsTransaction.create({
      data: {
        type: 'MILESTONE_BONUS',
        points: 0,
        balance: wallet.balance,
        description: 'Milestone reward: FREE Pro Plan (Worth ₹2,999) for 1 Month with 2% Commission',
        walletId: wallet.id,
      },
    });

    this.logger.log(`Granted milestone PRO plan to user ${userId}`);
  }

  async getMyReferrals(userId: string) {
    const code = await this.ensureReferralCode(userId);
    const wallet = await this.getOrCreateWallet(userId);

    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      include: {
        referred: { select: { firstName: true, lastName: true, orgName: true, createdAt: true } },
        qualifyingEvent: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: referrals.length,
      pending: referrals.filter(r => r.status === 'PENDING').length,
      qualified: referrals.filter(r => r.status === 'QUALIFIED').length,
      rewarded: referrals.filter(r => r.status === 'REWARDED').length,
      rejected: referrals.filter(r => r.status === 'REJECTED').length,
    };

    const totalPointsEarned = wallet.totalEarned;
    const progressToMilestone = Math.min(stats.rewarded, MILESTONE_COUNT);
    const milestoneReached = stats.rewarded >= MILESTONE_COUNT;

    return {
      referralCode: code,
      stats,
      totalPointsEarned,
      currentBalance: wallet.balance,
      progressToMilestone,
      milestoneReached,
      referrals: referrals.map(r => ({
        id: r.id,
        status: r.status,
        referredOrg: r.referred.orgName || `${r.referred.firstName} ${r.referred.lastName}`,
        referredAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
        rewardedAt: r.rewardedAt,
        rewardPoints: r.rewardPoints,
        referralNumber: r.referralNumber,
        grossTicketSales: r.grossTicketSales ? Number(r.grossTicketSales) : null,
        qualifyingEvent: r.qualifyingEvent?.title || null,
        rejectionReason: r.rejectionReason,
      })),
    };
  }

  async getMyWallet(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const transactions = await this.prisma.pointsTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      totalSpent: wallet.totalSpent,
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        points: t.points,
        balance: t.balance,
        description: t.description,
        createdAt: t.createdAt,
      })),
    };
  }

  async redeemPointsForSubscription(userId: string, points: number, subscriptionPaymentId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.balance < points) {
      throw new BadRequestException('Insufficient Thoovi Points balance');
    }

    const newBalance = wallet.balance - points;
    await this.prisma.$transaction([
      this.prisma.thoviPointsWallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
          totalSpent: wallet.totalSpent + points,
        },
      }),
      this.prisma.pointsTransaction.create({
        data: {
          type: 'SUBSCRIPTION_REDEMPTION',
          points: -points,
          balance: newBalance,
          description: `Redeemed ${points} Thoovi Points for subscription`,
          walletId: wallet.id,
        },
      }),
    ]);

    return { newBalance };
  }

  // ── Admin methods ──

  async adminGetAllReferrals(page = 1, limit = 20, status?: string) {
    const where: Prisma.ReferralWhereInput = status ? { status: status as ReferralStatus } : {};
    const [referrals, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        include: {
          referrer: { select: { id: true, firstName: true, lastName: true, orgName: true, email: true } },
          referred: { select: { id: true, firstName: true, lastName: true, orgName: true, email: true } },
          qualifyingEvent: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.referral.count({ where }),
    ]);

    return { referrals, total, page, totalPages: Math.ceil(total / limit) };
  }

  async adminGetReferralStats() {
    const [total, pending, qualified, rewarded, rejected] = await Promise.all([
      this.prisma.referral.count(),
      this.prisma.referral.count({ where: { status: 'PENDING' } }),
      this.prisma.referral.count({ where: { status: 'QUALIFIED' } }),
      this.prisma.referral.count({ where: { status: 'REWARDED' } }),
      this.prisma.referral.count({ where: { status: 'REJECTED' } }),
    ]);

    const totalPointsIssued = await this.prisma.pointsTransaction.aggregate({
      where: { type: 'REFERRAL_REWARD', points: { gt: 0 } },
      _sum: { points: true },
    });

    return {
      total,
      pending,
      qualified,
      rewarded,
      rejected,
      totalPointsIssued: totalPointsIssued._sum.points || 0,
    };
  }

  async adminUpdateReferral(referralId: string, status: string, rejectionReason?: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id: referralId } });
    if (!referral) throw new NotFoundException('Referral not found');

    if (status === 'REJECTED') {
      await this.prisma.referral.update({
        where: { id: referralId },
        data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason },
      });
      return { message: 'Referral rejected' };
    }

    if (status === 'REWARDED' && referral.status === 'QUALIFIED') {
      await this.processReferralReward(referralId);
      return { message: 'Referral rewarded' };
    }

    throw new BadRequestException('Invalid status transition');
  }

  async adminCreditPoints(userId: string, points: number, description: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const newBalance = wallet.balance + points;

    await this.prisma.$transaction([
      this.prisma.thoviPointsWallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance, totalEarned: wallet.totalEarned + points },
      }),
      this.prisma.pointsTransaction.create({
        data: {
          type: 'ADMIN_CREDIT',
          points,
          balance: newBalance,
          description: `Admin credit: ${description}`,
          walletId: wallet.id,
        },
      }),
    ]);

    return { newBalance };
  }

  async adminDebitPoints(userId: string, points: number, description: string) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.balance < points) {
      throw new BadRequestException('Insufficient balance to debit');
    }
    const newBalance = wallet.balance - points;

    await this.prisma.$transaction([
      this.prisma.thoviPointsWallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance, totalSpent: wallet.totalSpent + points },
      }),
      this.prisma.pointsTransaction.create({
        data: {
          type: 'ADMIN_DEBIT',
          points: -points,
          balance: newBalance,
          description: `Admin debit: ${description}`,
          walletId: wallet.id,
        },
      }),
    ]);

    return { newBalance };
  }

  async adminGetWallets(page = 1, limit = 20) {
    const [wallets, total] = await Promise.all([
      this.prisma.thoviPointsWallet.findMany({
        include: {
          user: { select: { id: true, firstName: true, lastName: true, orgName: true, email: true } },
        },
        orderBy: { balance: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.thoviPointsWallet.count(),
    ]);

    return { wallets, total, page, totalPages: Math.ceil(total / limit) };
  }
}
