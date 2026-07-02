import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto, CreateEventReviewDto, UpdateReviewDto } from './dto/create-review.dto';
import { AdminReviewActionDto } from './dto/admin-review-action.dto';
import { OrderStatus, ReviewStatus, Prisma } from '@thoovitickets/database';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: { id: true, userId: true, status: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('You can only review your own orders');
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('You can only review confirmed orders');
    }

    const existing = await this.prisma.platformReview.findUnique({
      where: { orderId: dto.orderId },
    });
    if (existing) throw new BadRequestException('You have already reviewed this order');

    return this.prisma.platformReview.create({
      data: {
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        userId,
        orderId: dto.orderId,
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async findByOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

    const review = await this.prisma.platformReview.findUnique({
      where: { orderId },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    return review;
  }

  async findMyReviews(userId: string) {
    return this.prisma.platformReview.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            orderNumber: true,
            items: {
              take: 1,
              include: { event: { select: { title: true } } },
            },
          },
        },
      },
    });
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.prisma.platformReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('You can only edit your own reviews');
    if (review.status !== ReviewStatus.PENDING) {
      throw new BadRequestException('Only pending reviews can be edited');
    }

    return this.prisma.platformReview.update({
      where: { id: reviewId },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async delete(userId: string, reviewId: string) {
    const review = await this.prisma.platformReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('You can only delete your own reviews');
    if (review.status !== ReviewStatus.PENDING) {
      throw new BadRequestException('Only pending reviews can be deleted');
    }

    await this.prisma.platformReview.delete({ where: { id: reviewId } });
    return { message: 'Review deleted successfully' };
  }

  async findApprovedForHomepage(limit = 10) {
    return this.prisma.platformReview.findMany({
      where: {
        status: ReviewStatus.APPROVED,
        isVisible: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        rating: true,
        title: true,
        content: true,
        createdAt: true,
        user: {
          select: { firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });
  }

  async findAllAdmin(filters: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PlatformReviewWhereInput = {};

    if (filters.status) {
      where.status = filters.status as ReviewStatus;
    }

    if (filters.search) {
      where.OR = [
        { content: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [reviews, total] = await Promise.all([
      this.prisma.platformReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          order: {
            select: {
              orderNumber: true,
              items: {
                take: 1,
                include: { event: { select: { title: true } } },
              },
            },
          },
        },
      }),
      this.prisma.platformReview.count({ where }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const [total, pending, approved, rejected, avgResult] = await Promise.all([
      this.prisma.platformReview.count(),
      this.prisma.platformReview.count({ where: { status: ReviewStatus.PENDING } }),
      this.prisma.platformReview.count({ where: { status: ReviewStatus.APPROVED } }),
      this.prisma.platformReview.count({ where: { status: ReviewStatus.REJECTED } }),
      this.prisma.platformReview.aggregate({ _avg: { rating: true } }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      averageRating: avgResult._avg.rating ? Number(avgResult._avg.rating.toFixed(1)) : 0,
    };
  }

  async adminAction(reviewId: string, adminId: string, dto: AdminReviewActionDto) {
    const review = await this.prisma.platformReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.platformReview.update({
      where: { id: reviewId },
      data: {
        status: dto.action as unknown as ReviewStatus,
        adminNotes: dto.adminNotes,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        ...(dto.action === 'APPROVED' && { isVisible: true }),
        ...(dto.action === 'REJECTED' && { isVisible: false }),
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async toggleVisibility(reviewId: string, isVisible: boolean) {
    const review = await this.prisma.platformReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.status !== ReviewStatus.APPROVED) {
      throw new BadRequestException('Only approved reviews can have visibility toggled');
    }

    return this.prisma.platformReview.update({
      where: { id: reviewId },
      data: { isVisible },
    });
  }

  // ─── EVENT REVIEWS ─────────────────────────────────

  async createEventReview(userId: string, dto: CreateEventReviewDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      select: { id: true, userId: true, status: true, items: { select: { eventId: true } } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('You can only review your own orders');
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('You can only review confirmed orders');
    }

    const eventInOrder = order.items.some(item => item.eventId === dto.eventId);
    if (!eventInOrder) throw new BadRequestException('This event is not part of your order');

    const existing = await this.prisma.eventReview.findUnique({
      where: { userId_eventId: { userId, eventId: dto.eventId } },
    });
    if (existing) throw new BadRequestException('You have already reviewed this event');

    return this.prisma.eventReview.create({
      data: {
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        userId,
        eventId: dto.eventId,
        orderId: dto.orderId,
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async findEventReviewByUser(userId: string, eventId: string) {
    return this.prisma.eventReview.findUnique({
      where: { userId_eventId: { userId, eventId } },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async findEventReviewsPublic(eventId: string) {
    const [reviews, stats] = await Promise.all([
      this.prisma.eventReview.findMany({
        where: { eventId, isVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          rating: true,
          title: true,
          content: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.eventReview.aggregate({
        where: { eventId, isVisible: true },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      reviews,
      averageRating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : 0,
      totalReviews: stats._count.rating,
    };
  }

  async findEventReviewsForOrganiser(organiserId: string, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organiserId: true },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== organiserId) throw new ForbiddenException('You can only view reviews for your own events');

    const [reviews, stats] = await Promise.all([
      this.prisma.eventReview.findMany({
        where: { eventId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
      }),
      this.prisma.eventReview.aggregate({
        where: { eventId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      reviews,
      averageRating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : 0,
      totalReviews: stats._count.rating,
    };
  }

  async toggleEventReviewVisibility(organiserId: string, reviewId: string, isVisible: boolean) {
    const review = await this.prisma.eventReview.findUnique({
      where: { id: reviewId },
      include: { event: { select: { organiserId: true } } },
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.event.organiserId !== organiserId) {
      throw new ForbiddenException('You can only manage reviews for your own events');
    }

    return this.prisma.eventReview.update({
      where: { id: reviewId },
      data: { isVisible },
    });
  }
}
