import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserStatus,
  UserRole,
  EventStatus,
  ApprovalType,
  ApprovalAction,
  Prisma,
} from '@thoovitickets/database';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { EventsService } from '../events/events.service';
import { EmailService } from '../email/email.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly emailService: EmailService,
  ) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalCustomers,
      totalOrganisers,
      pendingOrganisers,
      totalEvents,
      pendingEvents,
      publishedEvents,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.user.count({ where: { role: UserRole.ORGANISER } }),
      this.prisma.user.count({ where: { role: UserRole.ORGANISER, status: UserStatus.PENDING } }),
      this.prisma.event.count(),
      this.prisma.event.count({ where: { status: EventStatus.PENDING_APPROVAL } }),
      this.prisma.event.count({ where: { status: EventStatus.PUBLISHED } }),
    ]);

    return {
      totalUsers,
      totalCustomers,
      totalOrganisers,
      pendingOrganisers,
      totalEvents,
      pendingEvents,
      publishedEvents,
    };
  }

  async updateEventCommission(eventId: string, commissionPercent: number | null, commissionType?: string | null) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        commissionPercent,
        commissionType: commissionPercent !== null ? (commissionType || 'PERCENTAGE') : null,
      },
      select: { id: true, title: true, commissionPercent: true, commissionType: true },
    });
  }

  async getEventCommission(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, commissionPercent: true, organiserId: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    const user = await this.prisma.user.findUnique({
      where: { id: event.organiserId },
      select: { orgCommissionPercent: true, orgName: true, firstName: true, lastName: true },
    });

    const sub = await this.prisma.orgSubscription.findFirst({
      where: { userId: event.organiserId, status: 'ACTIVE', OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
      orderBy: { createdAt: 'desc' },
      select: { tier: true, commissionPercent: true },
    });

    return {
      eventCommission: event.commissionPercent ? Number(event.commissionPercent) : null,
      organiserCommission: user?.orgCommissionPercent ? Number(user.orgCommissionPercent) : null,
      planCommission: sub ? Number(sub.commissionPercent) : 4,
      planTier: sub?.tier || 'FREE',
      organiserName: user?.orgName || `${user?.firstName} ${user?.lastName}`,
      activeSource: event.commissionPercent !== null ? 'event' : user?.orgCommissionPercent !== null ? 'organiser' : 'plan',
      activeRate: event.commissionPercent !== null ? Number(event.commissionPercent) : user?.orgCommissionPercent !== null ? Number(user!.orgCommissionPercent) : (sub ? Number(sub.commissionPercent) : 4),
    };
  }

  async updatePlatformConfig(id: string, data: Record<string, unknown>) {
    return this.prisma.platformConfig.update({ where: { id }, data });
  }

  async getUsers(query: { role?: string; status?: string; search?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.role) where.role = query.role as UserRole;
    if (query.status) where.status = query.status as UserStatus;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { orgName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          orgName: true,
          orgDescription: true,
          avatarUrl: true,
          statusReason: true,
          idDocumentType: true,
          aadharDocumentUrl: true,
          panDocumentUrl: true,
          profileCompleted: true,
          orgCommissionPercent: true,
          createdAt: true,
          subscriptions: {
            where: { status: 'ACTIVE', OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { tier: true, commissionPercent: true },
          },
          _count: { select: { events: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const usersWithSub = users.map((u) => {
      const sub = u.subscriptions[0] || null;
      const { subscriptions, ...rest } = u;
      return {
        ...rest,
        planTier: sub?.tier || 'FREE',
        planCommissionPercent: sub ? Number(sub.commissionPercent) : 4,
      };
    });

    return { users: usersWithSub, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateUserStatus(userId: string, adminId: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.ADMIN) throw new BadRequestException('Cannot modify admin users');

    const updateData: Record<string, unknown> = { status: dto.status as UserStatus };

    if (dto.status === 'SUSPENDED') {
      updateData.statusReason = dto.reason || 'Account suspended by admin';
    } else if (dto.status === 'REJECTED') {
      updateData.statusReason = dto.reason || 'Registration rejected by admin';
    } else if (dto.status === 'ACTIVE') {
      updateData.statusReason = null;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        orgName: true,
        orgDescription: true,
        statusReason: true,
        emailVerified: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const approvalType = user.status === UserStatus.PENDING
      ? ApprovalType.USER_REGISTRATION
      : dto.status === 'ACTIVE' && user.status === UserStatus.SUSPENDED
        ? 'USER_REACTIVATION' as ApprovalType
        : null;

    if (approvalType && user.role === UserRole.ORGANISER) {
      await this.prisma.adminApproval.create({
        data: {
          type: approvalType,
          action: dto.status === 'ACTIVE' ? ApprovalAction.APPROVED : ApprovalAction.REJECTED,
          reason: dto.reason,
          requesterId: userId,
          reviewerId: adminId,
        },
      });
    }

    // Send status change email notifications
    try {
      if (dto.status === 'SUSPENDED') {
        await this.emailService.sendAccountSuspendedEmail(user.email, {
          firstName: user.firstName,
          reason: dto.reason || 'Account suspended by admin',
        });
      } else if (dto.status === 'REJECTED') {
        await this.emailService.sendAccountRejectedEmail(user.email, {
          firstName: user.firstName,
          reason: dto.reason || 'Registration rejected by admin',
        });
      } else if (dto.status === 'ACTIVE' && (user.status === UserStatus.SUSPENDED || user.status === UserStatus.PENDING)) {
        await this.emailService.sendAccountReactivatedEmail(user.email, {
          firstName: user.firstName,
        });
      }
    } catch (emailError) {
      // Log but don't fail the status update if email fails
      this.logger.warn(`Failed to send status change email to ${user.email}: ${emailError}`);
    }

    return updated;
  }

  async getEventDetail(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        category: true,
        ticketTypes: { orderBy: { sortOrder: 'asc' } },
        organiser: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            phone: true, orgName: true, orgDescription: true, avatarUrl: true,
            aadharDocumentUrl: true, panDocumentUrl: true,
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async getEvents(query: { status?: string; search?: string; page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {};

    if (query.status) where.status = query.status as EventStatus;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { venue: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          organiser: {
            select: { id: true, firstName: true, lastName: true, orgName: true, email: true },
          },
          ticketTypes: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { events, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateEventStatus(eventId: string, adminId: string, dto: ApprovalActionDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    if (event.status !== EventStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only events pending approval can be reviewed');
    }

    const newStatus = dto.action === 'APPROVED' ? EventStatus.PUBLISHED : EventStatus.REJECTED;

    const [updated] = await this.prisma.$transaction([
      this.prisma.event.update({
        where: { id: eventId },
        data: { status: newStatus },
        include: {
          category: true,
          organiser: {
            select: { id: true, firstName: true, lastName: true, orgName: true },
          },
        },
      }),
      this.prisma.adminApproval.create({
        data: {
          type: ApprovalType.EVENT_PUBLISH,
          action: dto.action as ApprovalAction,
          reason: dto.reason,
          notes: dto.notes,
          requesterId: event.organiserId,
          reviewerId: adminId,
          eventId,
        },
      }),
    ]);

    return updated;
  }

  async getPendingApprovals() {
    const [pendingOrganisers, pendingEvents, pendingActions] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: UserRole.ORGANISER, status: UserStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          orgName: true,
          orgDescription: true,
          avatarUrl: true,
          idDocumentType: true,
          aadharDocumentUrl: true,
          panDocumentUrl: true,
          emailVerified: true,
          profileCompleted: true,
          createdAt: true,
        },
      }),
      this.prisma.event.findMany({
        where: { status: EventStatus.PENDING_APPROVAL },
        orderBy: { createdAt: 'asc' },
        include: {
          category: true,
          organiser: {
            select: { id: true, firstName: true, lastName: true, orgName: true, email: true, phone: true },
          },
          ticketTypes: true,
        },
      }),
      this.prisma.adminApproval.findMany({
        where: {
          action: ApprovalAction.PENDING,
          type: { in: [ApprovalType.EVENT_CANCEL, ApprovalType.EVENT_POSTPONE, 'USER_REACTIVATION' as ApprovalType] },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          requester: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, orgName: true } },
          event: { select: { id: true, title: true, venue: true, startDate: true, status: true } },
        },
      }),
    ]);

    return { pendingOrganisers, pendingEvents, pendingActions };
  }

  async getPlans() {
    return this.prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createPlan(data: {
    tier: string; name: string; price: number;
    maxEventsPerMonth: number; maxTicketTiers: number; maxTicketsPerEvent: number;
    maxStaffAccounts: number; commissionPercent: number; features: string[]; sortOrder?: number;
  }) {
    return this.prisma.plan.create({ data });
  }

  async updatePlan(id: string, data: Record<string, unknown>) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.plan.update({ where: { id }, data });
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.tier === 'FREE') throw new BadRequestException('Cannot delete the FREE plan');

    return this.prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getCategories() {
    return this.prisma.eventCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { events: true } } },
    });
  }

  async createCategory(data: { name: string; slug: string; icon?: string; description?: string; sortOrder?: number }) {
    return this.prisma.eventCategory.create({
      data: {
        name: data.name,
        slug: data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        icon: data.icon || null,
        description: data.description || null,
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  async updateCategory(id: string, data: { name?: string; icon?: string; description?: string; isActive?: boolean; sortOrder?: number }) {
    return this.prisma.eventCategory.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string) {
    const eventsCount = await this.prisma.event.count({ where: { categoryId: id } });
    if (eventsCount > 0) {
      throw new BadRequestException(`Cannot delete category — ${eventsCount} events are using it`);
    }
    await this.prisma.eventCategory.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  async getContentPages() {
    return this.prisma.contentPage.findMany({ orderBy: [{ slug: 'asc' }, { audience: 'asc' }] });
  }

  async getContentPage(id: string) {
    const page = await this.prisma.contentPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Content page not found');
    return page;
  }

  async updateContentPage(id: string, adminId: string, data: { title?: string; content?: string }) {
    const page = await this.prisma.contentPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Content page not found');
    return this.prisma.contentPage.update({
      where: { id },
      data: { ...data, updatedBy: adminId },
    });
  }

  async markPaymentRefunded(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED' as any, metadata: { ...(payment.metadata as any || {}), refundedAt: new Date().toISOString(), refundedBy: 'admin' } },
    });

    return { message: 'Payment marked as refunded' };
  }

  async reviewEventAction(approvalId: string, adminId: string, dto: ApprovalActionDto) {
    const approval = await this.prisma.adminApproval.findUnique({
      where: { id: approvalId },
      include: { event: true },
    });

    if (!approval) throw new NotFoundException('Approval request not found');
    if (approval.action !== ApprovalAction.PENDING) throw new BadRequestException('Request already reviewed');

    await this.prisma.adminApproval.update({
      where: { id: approvalId },
      data: {
        action: dto.action === 'APPROVED' ? ApprovalAction.APPROVED : ApprovalAction.REJECTED,
        reviewerId: adminId,
        notes: dto.notes || dto.reason || null,
      },
    });

    if (dto.action === 'APPROVED') {
      if (approval.type === ApprovalType.EVENT_CANCEL && approval.eventId) {
        await this.eventsService.executeCancelEvent(approval.eventId, approval.reason || 'Cancelled by organiser');
      } else if (approval.type === ApprovalType.EVENT_POSTPONE && approval.eventId) {
        const meta = approval.metadata as any;
        if (meta?.startDate && meta?.endDate) {
          await this.eventsService.executePostponeEvent(approval.eventId, {
            startDate: meta.startDate,
            endDate: meta.endDate,
            saleCutoffDate: meta.saleCutoffDate,
            message: meta.message || approval.reason || '',
          });
        }
      } else if (approval.type as string === 'USER_REACTIVATION') {
        await this.prisma.user.update({
          where: { id: approval.requesterId },
          data: { status: UserStatus.ACTIVE, statusReason: null },
        });
      }
    }

    const typeLabels: Record<string, string> = {
      EVENT_CANCEL: 'Cancellation',
      EVENT_POSTPONE: 'Postponement',
      USER_REACTIVATION: 'Reactivation',
    };

    return {
      message: dto.action === 'APPROVED'
        ? `${typeLabels[approval.type] || 'Request'} approved and executed`
        : 'Request rejected',
    };
  }

  async getConvenienceFeeSlabs() {
    return this.prisma.convenienceFeeSlab.findMany({
      orderBy: { minAmount: 'asc' },
    });
  }

  async createConvenienceFeeSlab(data: {
    minAmount: number;
    maxAmount?: number | null;
    feeType: string;
    feeValue: number;
    isActive?: boolean;
  }) {
    return this.prisma.convenienceFeeSlab.create({
      data: {
        minAmount: data.minAmount,
        maxAmount: data.maxAmount ?? null,
        feeType: data.feeType,
        feeValue: data.feeValue,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateConvenienceFeeSlab(id: string, data: {
    minAmount?: number;
    maxAmount?: number | null;
    feeType?: string;
    feeValue?: number;
    isActive?: boolean;
  }) {
    const slab = await this.prisma.convenienceFeeSlab.findUnique({ where: { id } });
    if (!slab) throw new NotFoundException('Convenience fee slab not found');
    return this.prisma.convenienceFeeSlab.update({ where: { id }, data });
  }

  async deleteConvenienceFeeSlab(id: string) {
    const slab = await this.prisma.convenienceFeeSlab.findUnique({ where: { id } });
    if (!slab) throw new NotFoundException('Convenience fee slab not found');
    await this.prisma.convenienceFeeSlab.delete({ where: { id } });
    return { message: 'Convenience fee slab deleted' };
  }

  // ─── HOME BANNERS ─────────────────────────────────

  async getBanners() {
    return this.prisma.homeBanner.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { event: { select: { id: true, title: true, slug: true } } },
    });
  }

  async createBanner(data: {
    title: string;
    description?: string;
    imageUrl: string;
    linkType?: string;
    linkUrl?: string;
    eventId?: string;
  }) {
    const maxOrder = await this.prisma.homeBanner.aggregate({ _max: { sortOrder: true } });
    return this.prisma.homeBanner.create({
      data: {
        ...data,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateBanner(id: string, data: {
    title?: string;
    description?: string;
    imageUrl?: string;
    linkType?: string;
    linkUrl?: string;
    eventId?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const banner = await this.prisma.homeBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return this.prisma.homeBanner.update({ where: { id }, data });
  }

  async reorderBanners(ids: string[]) {
    await Promise.all(
      ids.map((id, index) =>
        this.prisma.homeBanner.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return { message: 'Banners reordered' };
  }

  async deleteBanner(id: string) {
    const banner = await this.prisma.homeBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    await this.prisma.homeBanner.delete({ where: { id } });
    return { message: 'Banner deleted' };
  }
}
