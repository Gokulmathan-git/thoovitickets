import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PriceBreakdown {
  subtotal: number;
  platformFee: number;
  platformFeeType: string | null;
  totalAmount: number;
  orgCommissionPercent: number;
  orgCommissionType: string;
  orgCommission: number;
  orgPayout: number;
}

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformConfig() {
    let config = await this.prisma.platformConfig.findFirst();
    if (!config) {
      config = await this.prisma.platformConfig.create({
        data: { platformFeePercent: 0, defaultOrgCommission: 2.0 },
      });
    }
    return config;
  }

  async getCommission(organiserId: string, eventId?: string): Promise<{ value: number; type: string; source: string }> {
    if (eventId) {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        select: { commissionPercent: true, commissionType: true },
      });
      if (event?.commissionPercent !== null && event?.commissionPercent !== undefined) {
        return { value: Number(event.commissionPercent), type: event.commissionType || 'PERCENTAGE', source: 'event' };
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: organiserId },
      select: { orgCommissionPercent: true, orgCommissionType: true },
    });
    if (user?.orgCommissionPercent !== null && user?.orgCommissionPercent !== undefined) {
      return { value: Number(user.orgCommissionPercent), type: user.orgCommissionType || 'PERCENTAGE', source: 'organiser' };
    }

    const sub = await this.prisma.orgSubscription.findFirst({
      where: {
        userId: organiserId,
        status: 'ACTIVE',
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (sub) {
      return { value: Number(sub.commissionPercent), type: (sub as any).commissionType || 'PERCENTAGE', source: 'plan' };
    }

    return { value: 4, type: 'PERCENTAGE', source: 'plan' };
  }

  calculateCommissionAmount(subtotal: number, value: number, type: string): number {
    if (type === 'FIXED') return value;
    return Math.round(subtotal * value) / 100;
  }

  async calculatePlatformFee(subtotal: number): Promise<{ fee: number; type: string | null }> {
    const slab = await this.prisma.convenienceFeeSlab.findFirst({
      where: {
        isActive: true,
        minAmount: { lte: subtotal },
        OR: [
          { maxAmount: { gte: subtotal } },
          { maxAmount: null },
        ],
      },
    });

    if (!slab) return { fee: 0, type: null };

    const feeValue = Number(slab.feeValue);

    if (slab.feeType === 'FIXED') {
      return { fee: feeValue, type: 'FIXED' };
    }

    if (slab.feeType === 'PERCENTAGE') {
      return { fee: Math.round(subtotal * feeValue) / 100, type: 'PERCENTAGE' };
    }

    return { fee: 0, type: null };
  }

  async calculatePriceBreakdown(
    items: { ticketTypeId: string; quantity: number }[],
    organiserId?: string,
    eventId?: string,
  ): Promise<PriceBreakdown> {
    let subtotal = 0;
    for (const item of items) {
      const ticketType = await this.prisma.ticketType.findUnique({
        where: { id: item.ticketTypeId },
        select: { price: true },
      });
      if (ticketType) {
        subtotal += Number(ticketType.price) * item.quantity;
      }
    }

    const { fee: platformFee, type: platformFeeType } = await this.calculatePlatformFee(subtotal);
    const totalAmount = subtotal + platformFee;

    let commissionValue = 4;
    let commissionType = 'PERCENTAGE';
    if (organiserId) {
      const commission = await this.getCommission(organiserId, eventId);
      commissionValue = commission.value;
      commissionType = commission.type;
    }

    const orgCommission = this.calculateCommissionAmount(subtotal, commissionValue, commissionType);
    const orgPayout = subtotal - orgCommission;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      platformFeeType,
      totalAmount: Math.round(totalAmount * 100) / 100,
      orgCommissionPercent: commissionValue,
      orgCommissionType: commissionType,
      orgCommission: Math.round(orgCommission * 100) / 100,
      orgPayout: Math.round(orgPayout * 100) / 100,
    };
  }

  async updateDefaultOrgCommission(commissionPercent: number) {
    const config = await this.getPlatformConfig();
    return this.prisma.platformConfig.update({
      where: { id: config.id },
      data: { defaultOrgCommission: commissionPercent },
    });
  }

  async updateOrgCommission(organiserId: string, commissionPercent: number | null, commissionType?: string | null) {
    return this.prisma.user.update({
      where: { id: organiserId },
      data: {
        orgCommissionPercent: commissionPercent,
        orgCommissionType: commissionPercent !== null ? (commissionType || 'PERCENTAGE') : null,
      },
    });
  }
}
