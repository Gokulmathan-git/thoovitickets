import {
  Injectable,
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
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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
          createdAt: true,
          _count: { select: { events: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateUserStatus(userId: string, adminId: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.ADMIN) throw new BadRequestException('Cannot modify admin users');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status as UserStatus },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        orgName: true,
      },
    });

    if (user.role === UserRole.ORGANISER && user.status === UserStatus.PENDING) {
      await this.prisma.adminApproval.create({
        data: {
          type: ApprovalType.USER_REGISTRATION,
          action: dto.status === 'ACTIVE' ? ApprovalAction.APPROVED : ApprovalAction.REJECTED,
          reason: dto.reason,
          requesterId: userId,
          reviewerId: adminId,
        },
      });
    }

    return updated;
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
    const [pendingOrganisers, pendingEvents] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: UserRole.ORGANISER, status: UserStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          orgName: true,
          orgDescription: true,
          createdAt: true,
        },
      }),
      this.prisma.event.findMany({
        where: { status: EventStatus.PENDING_APPROVAL },
        orderBy: { createdAt: 'asc' },
        include: {
          category: true,
          organiser: {
            select: { id: true, firstName: true, lastName: true, orgName: true, email: true },
          },
          ticketTypes: true,
        },
      }),
    ]);

    return { pendingOrganisers, pendingEvents };
  }
}
