import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, StaffAccessLevel } from '@thoovitickets/database';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async getMyStaff(organiserId: string) {
    return this.prisma.staffAccount.findMany({
      where: { organiserId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addStaff(organiserId: string, email: string, accessLevel: StaffAccessLevel) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) throw new NotFoundException('No account found with this email. They must register as a customer first.');
    if (user.role !== UserRole.CUSTOMER) throw new BadRequestException('Only customer accounts can be added as staff');
    if (user.id === organiserId) throw new BadRequestException('Cannot add yourself as staff');

    const existing = await this.prisma.staffAccount.findUnique({
      where: { organiserId_userId: { organiserId, userId: user.id } },
    });
    if (existing) throw new BadRequestException('This user is already a staff member');

    const sub = await this.subscriptionsService.getActiveSubscription(organiserId);
    const staffCount = await this.prisma.staffAccount.count({ where: { organiserId, isActive: true } });
    if (staffCount >= sub.maxStaffAccounts) {
      throw new BadRequestException(`Staff limit reached (${staffCount}/${sub.maxStaffAccounts}). Upgrade your plan to add more.`);
    }

    return this.prisma.staffAccount.create({
      data: { organiserId, userId: user.id, accessLevel },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true } },
      },
    });
  }

  async updateStaff(organiserId: string, staffId: string, data: { accessLevel?: StaffAccessLevel; isActive?: boolean }) {
    const staff = await this.prisma.staffAccount.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff account not found');
    if (staff.organiserId !== organiserId) throw new ForbiddenException('Not your staff member');

    return this.prisma.staffAccount.update({
      where: { id: staffId },
      data,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true } },
      },
    });
  }

  async removeStaff(organiserId: string, staffId: string) {
    const staff = await this.prisma.staffAccount.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff account not found');
    if (staff.organiserId !== organiserId) throw new ForbiddenException('Not your staff member');

    await this.prisma.staffAccount.delete({ where: { id: staffId } });
    return { message: 'Staff member removed' };
  }

  async getMyAccess(userId: string) {
    return this.prisma.staffAccount.findMany({
      where: { userId, isActive: true },
      include: {
        organiser: {
          select: { id: true, firstName: true, lastName: true, orgName: true, avatarUrl: true },
        },
      },
    });
  }
}
