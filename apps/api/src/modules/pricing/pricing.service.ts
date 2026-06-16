import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PriceBreakdown {
  subtotal: number;
  platformFeePercent: number;
  platformFee: number;
  totalAmount: number;
  orgCommissionPercent: number;
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
        data: { platformFeePercent: 3.0, defaultOrgCommission: 2.0 },
      });
    }
    return config;
  }

  async getOrgCommissionPercent(organiserId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: organiserId },
      select: { orgCommissionPercent: true },
    });

    if (user?.orgCommissionPercent !== null && user?.orgCommissionPercent !== undefined) {
      return Number(user.orgCommissionPercent);
    }

    const config = await this.getPlatformConfig();
    return Number(config.defaultOrgCommission);
  }

  async calculatePriceBreakdown(
    items: { ticketTypeId: string; quantity: number }[],
    organiserId?: string,
  ): Promise<PriceBreakdown> {
    const config = await this.getPlatformConfig();
    const platformFeePercent = Number(config.platformFeePercent);

    // Calculate subtotal from DB prices — NEVER trust frontend
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

    const platformFee = Math.round(subtotal * platformFeePercent) / 100;
    const totalAmount = subtotal + platformFee;

    let orgCommissionPercent = Number(config.defaultOrgCommission);
    if (organiserId) {
      orgCommissionPercent = await this.getOrgCommissionPercent(organiserId);
    }

    const orgCommission = Math.round(subtotal * orgCommissionPercent) / 100;
    const orgPayout = subtotal - orgCommission;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      platformFeePercent,
      platformFee: Math.round(platformFee * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      orgCommissionPercent,
      orgCommission: Math.round(orgCommission * 100) / 100,
      orgPayout: Math.round(orgPayout * 100) / 100,
    };
  }

  async updatePlatformFee(feePercent: number) {
    const config = await this.getPlatformConfig();
    return this.prisma.platformConfig.update({
      where: { id: config.id },
      data: { platformFeePercent: feePercent },
    });
  }

  async updateDefaultOrgCommission(commissionPercent: number) {
    const config = await this.getPlatformConfig();
    return this.prisma.platformConfig.update({
      where: { id: config.id },
      data: { defaultOrgCommission: commissionPercent },
    });
  }

  async updateOrgCommission(organiserId: string, commissionPercent: number) {
    return this.prisma.user.update({
      where: { id: organiserId },
      data: { orgCommissionPercent: commissionPercent },
    });
  }
}
