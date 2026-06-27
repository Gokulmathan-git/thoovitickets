import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type NotificationType =
  | 'EVENT_APPROVED'
  | 'EVENT_REJECTED'
  | 'EVENT_PUBLISHED'
  | 'EVENT_CANCELLED'
  | 'EVENT_POSTPONED'
  | 'ORGANISER_APPROVED'
  | 'ORGANISER_REJECTED'
  | 'ORGANISER_SUSPENDED'
  | 'SETTLEMENT_COMPLETED'
  | 'SETTLEMENT_REJECTED'
  | 'SETTLEMENT_PROCESSING'
  | 'NEW_ORDER'
  | 'NEW_APPROVAL_REQUEST'
  | 'NEW_SETTLEMENT_REQUEST'
  | 'EVENT_REMINDER';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    linkUrl?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  async createForAdmins(data: {
    type: NotificationType;
    title: string;
    message: string;
    linkUrl?: string;
  }) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    if (admins.length === 0) return;

    await this.prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: data.type,
        title: data.title,
        message: data.message,
        linkUrl: data.linkUrl,
      })),
    });
  }

  async getForUser(userId: string, limit = 30) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { notifications, unreadCount };
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
