import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { EventStatus, OrderStatus, TicketStatus, Prisma } from '@thoovitickets/database';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly emailService: EmailService,
  ) {}

  async create(organiserId: string, dto: CreateEventDto) {
    const organiser = await this.prisma.user.findUnique({
      where: { id: organiserId },
      select: { profileCompleted: true, emailVerified: true, status: true },
    });

    if (!organiser?.profileCompleted) {
      throw new ForbiddenException(
        'Please complete your profile before creating events. Verify your email and upload your Aadhaar & PAN documents.',
      );
    }

    if (organiser.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Your account must be approved by admin before you can create events. Please complete your profile and wait for approval.',
      );
    }

    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check subscription limits
    const limit = await this.subscriptionsService.checkEventLimit(organiserId);
    if (!limit.allowed) {
      throw new BadRequestException(
        `Event limit reached (${limit.used}/${limit.max} this month on ${limit.tier} plan). Upgrade your subscription to create more events.`,
      );
    }

    const maxTicketTiers = await this.subscriptionsService.checkTicketTierLimit(organiserId);
    if (dto.ticketTypes.length > maxTicketTiers) {
      throw new BadRequestException(
        `Your ${limit.tier} plan allows ${maxTicketTiers} ticket tiers per event. Upgrade to add more.`,
      );
    }

    const maxTickets = await this.subscriptionsService.checkTicketLimit(organiserId);
    const totalTickets = dto.ticketTypes.reduce((sum, tt) => sum + tt.totalQty, 0);
    if (totalTickets > maxTickets) {
      throw new BadRequestException(
        `Your ${limit.tier} plan allows ${maxTickets} total tickets per event. You're trying to add ${totalTickets}. Upgrade to increase.`,
      );
    }

    const category = await this.prisma.eventCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new BadRequestException('Invalid category');

    const slug = await this.generateUniqueSlug(dto.title);

    const { ticketTypes, saleCutoffDate, shortDesc, ...eventData } = dto;

    return this.prisma.event.create({
      data: {
        ...eventData as any,
        slug,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        saleCutoffDate: saleCutoffDate ? new Date(saleCutoffDate) : null,
        timezone: dto.timezone || 'Asia/Kolkata',
        organiserId,
        status: EventStatus.DRAFT,
        tags: dto.tags || [],
        country: dto.country || 'India',
        ticketTypes: {
          create: ticketTypes.map((tt: any, index: number) => ({
            name: tt.name,
            description: tt.description,
            price: tt.price,
            currency: tt.currency || 'INR',
            totalQty: tt.totalQty,
            maxPerOrder: tt.maxPerOrder || 5,
            saleStart: tt.saleStartNow ? new Date() : tt.saleStart ? new Date(tt.saleStart) : null,
            saleEnd: tt.saleEnd ? new Date(tt.saleEnd) : null,
            sortOrder: index,
          })),
        },
      },
      include: {
        category: true,
        ticketTypes: { orderBy: { sortOrder: 'asc' } },
        organiser: {
          select: { id: true, firstName: true, lastName: true, orgName: true },
        },
      },
    });
  }

  async findAllPublic(query: QueryEventDto) {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
    };

    if (query.category) {
      where.category = { slug: query.category };
    }

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { venue: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.EventOrderByWithRelationInput = { startDate: 'asc' };
    switch (query.sort) {
      case 'date_desc':
        orderBy = { startDate: 'desc' };
        break;
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: true,
          ticketTypes: {
            where: { isActive: true },
            orderBy: { price: 'asc' },
            take: 1,
          },
          organiser: {
            select: { id: true, firstName: true, lastName: true, orgName: true },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findFeatured() {
    const events = await this.prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        startDate: { gte: new Date() },
      },
      orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
      take: 6,
      include: {
        category: true,
        ticketTypes: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
          take: 1,
        },
        organiser: {
          select: { id: true, firstName: true, lastName: true, orgName: true },
        },
      },
    });
    return events;
  }

  async getHomeBanners() {
    const [eventBanners, adminBanners] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          status: EventStatus.PUBLISHED,
          showOnHomeBanner: true,
          homeBannerUrl: { not: null },
          startDate: { gte: new Date() },
        },
        orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
        take: 10,
        select: {
          id: true,
          title: true,
          slug: true,
          homeBannerUrl: true,
          homeBannerTitle: true,
          homeBannerDesc: true,
          shortDesc: true,
          startDate: true,
          venue: true,
          city: true,
          category: { select: { name: true } },
          ticketTypes: {
            where: { isActive: true },
            orderBy: { price: 'asc' },
            take: 1,
            select: { price: true },
          },
        },
      }),
      this.prisma.homeBanner.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { event: { select: { slug: true, title: true } } },
      }),
    ]);

    return { eventBanners, adminBanners };
  }

  async getCities() {
    const cities = await this.prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    });
    return cities.map((c) => c.city);
  }

  async findBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        category: true,
        ticketTypes: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        organiser: {
          select: { id: true, firstName: true, lastName: true, orgName: true, avatarUrl: true },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found');

    if (event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async findMyEvents(organiserId: string, status?: string) {
    const where: Prisma.EventWhereInput = { organiserId };
    if (status) {
      where.status = status as EventStatus;
    }

    return this.prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        ticketTypes: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { ticketTypes: true } },
      },
    });
  }

  async findOneForOrganiser(id: string, organiserId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        ticketTypes: { orderBy: { sortOrder: 'asc' } },
        organiser: {
          select: { id: true, firstName: true, lastName: true, orgName: true },
        },
      },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You can only view your own events');
    }

    return event;
  }

  async update(id: string, organiserId: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { orderItems: { take: 1 } },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You can only edit your own events');
    }

    const allowedStatuses: EventStatus[] = [EventStatus.DRAFT, EventStatus.REJECTED, EventStatus.PUBLISHED];
    if (!allowedStatuses.includes(event.status)) {
      throw new BadRequestException('This event cannot be edited in its current status');
    }

    const hasSales = event.orderItems.length > 0;

    if (event.status === EventStatus.PUBLISHED) {
      const lockedFields = ['title', 'categoryId', 'timezone'];
      if (hasSales) {
        lockedFields.push('venue', 'address', 'city', 'state', 'country');
      }
      for (const field of lockedFields) {
        if (dto[field] !== undefined) {
          throw new BadRequestException(`Cannot change "${field}" for a published event${hasSales ? ' with ticket sales' : ''}`);
        }
      }
    }

    const updateData: Record<string, unknown> = { ...dto };
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    if (dto.saleCutoffDate) updateData.saleCutoffDate = new Date(dto.saleCutoffDate);

    if (dto.title && dto.title !== event.title) {
      updateData.slug = await this.generateUniqueSlug(dto.title);
    }

    return this.prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        ticketTypes: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async toggleHomeBanner(
    id: string,
    organiserId: string,
    data: { showOnHomeBanner: boolean; homeBannerUrl?: string; homeBannerTitle?: string; homeBannerDesc?: string },
  ) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You can only modify your own events');
    }

    if (data.showOnHomeBanner) {
      const sub = await this.subscriptionsService.getActiveSubscription(organiserId);
      if (sub.tier !== 'ADVANCE' && sub.tier !== 'ENTERPRISE') {
        throw new BadRequestException(
          'Homepage banner is available for PREMIUM and ENTERPRISE plans only. Upgrade your subscription.',
        );
      }
      if (!data.homeBannerUrl && !event.homeBannerUrl) {
        throw new BadRequestException('Please provide a banner image URL');
      }
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        showOnHomeBanner: data.showOnHomeBanner,
        ...(data.homeBannerUrl && { homeBannerUrl: data.homeBannerUrl }),
        ...(data.homeBannerTitle !== undefined && { homeBannerTitle: data.homeBannerTitle }),
        ...(data.homeBannerDesc !== undefined && { homeBannerDesc: data.homeBannerDesc }),
      },
      include: { category: true },
    });
  }

  async submitForApproval(id: string, organiserId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { ticketTypes: true },
    });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You can only submit your own events');
    }
    if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.REJECTED) {
      throw new BadRequestException('Only draft or rejected events can be submitted');
    }
    if (event.ticketTypes.length === 0) {
      throw new BadRequestException('Event must have at least one ticket type');
    }

    return this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.PENDING_APPROVAL },
      include: { category: true, ticketTypes: true },
    });
  }

  async delete(id: string, organiserId: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You can only delete your own events');
    }
    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Only draft events can be deleted');
    }

    await this.prisma.event.delete({ where: { id } });
    return { message: 'Event deleted successfully' };
  }

  async requestCancelEvent(id: string, organiserId: string, reason: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== organiserId) throw new ForbiddenException('You can only cancel your own events');
    if (event.status !== EventStatus.PUBLISHED && event.status !== EventStatus.APPROVED) {
      throw new BadRequestException('Only published or approved events can be cancelled');
    }

    const existing = await this.prisma.adminApproval.findFirst({
      where: { eventId: id, type: 'EVENT_CANCEL', action: 'PENDING' },
    });
    if (existing) throw new BadRequestException('A cancellation request is already pending');

    await this.prisma.adminApproval.create({
      data: {
        type: 'EVENT_CANCEL',
        action: 'PENDING',
        reason,
        requesterId: organiserId,
        eventId: id,
      },
    });

    return { message: 'Cancellation request submitted. Admin will review and process it.' };
  }

  async requestPostponeEvent(
    id: string,
    organiserId: string,
    data: { startDate: string; endDate: string; saleCutoffDate?: string; message: string },
  ) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== organiserId) throw new ForbiddenException('You can only postpone your own events');
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Only published events can be postponed');
    }

    const newStart = new Date(data.startDate);
    const newEnd = new Date(data.endDate);
    if (newEnd <= newStart) throw new BadRequestException('End date must be after start date');
    if (newStart <= new Date()) throw new BadRequestException('New start date must be in the future');

    const existing = await this.prisma.adminApproval.findFirst({
      where: { eventId: id, type: 'EVENT_POSTPONE', action: 'PENDING' },
    });
    if (existing) throw new BadRequestException('A postponement request is already pending');

    await this.prisma.adminApproval.create({
      data: {
        type: 'EVENT_POSTPONE',
        action: 'PENDING',
        reason: data.message,
        requesterId: organiserId,
        eventId: id,
        metadata: {
          startDate: data.startDate,
          endDate: data.endDate,
          saleCutoffDate: data.saleCutoffDate || null,
          message: data.message,
        } as any,
      },
    });

    return { message: 'Postponement request submitted. Admin will review and process it.' };
  }

  async executeCancelEvent(id: string, reason: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id },
        data: {
          status: EventStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason,
          showOnHomeBanner: false,
        },
      });

      await tx.ticket.updateMany({
        where: { order: { items: { some: { eventId: id } } }, status: TicketStatus.ACTIVE },
        data: { status: TicketStatus.CANCELLED },
      });

      await tx.order.updateMany({
        where: { items: { some: { eventId: id } }, status: OrderStatus.CONFIRMED },
        data: { status: OrderStatus.REFUNDED },
      });
    });

    this.sendCancelNotificationsAsync(id, event.title, event.venue, event.startDate, reason);
  }

  async executePostponeEvent(id: string, data: { startDate: string; endDate: string; saleCutoffDate?: string; message: string }) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');

    const newStart = new Date(data.startDate);
    const newEnd = new Date(data.endDate);
    const originalStartDate = event.startDate;

    await this.prisma.event.update({
      where: { id },
      data: {
        startDate: newStart,
        endDate: newEnd,
        saleCutoffDate: data.saleCutoffDate ? new Date(data.saleCutoffDate) : event.saleCutoffDate,
        postponedFrom: originalStartDate,
        postponeMessage: data.message,
      },
    });

    this.sendPostponeNotificationsAsync(id, event.title, event.venue, originalStartDate, newStart, data.message);
  }

  private sendCancelNotificationsAsync(eventId: string, title: string, venue: string, startDate: Date, reason: string) {
    (async () => {
      try {
        const holders = await this.getTicketHolders(eventId);
        for (const holder of holders) {
          await this.emailService.sendEventCancelledEmail(holder.email, {
            firstName: holder.name,
            eventTitle: title,
            eventDate: startDate.toLocaleDateString('en-IN', { dateStyle: 'long' }),
            venue,
            reason,
          });
        }
        this.logger.log(`Sent cancellation emails to ${holders.length} ticket holders for "${title}"`);
      } catch (error) {
        this.logger.error(`Failed to send cancel notifications for event ${eventId}`, error);
      }
    })();
  }

  private sendPostponeNotificationsAsync(
    eventId: string, title: string, venue: string,
    oldDate: Date, newDate: Date, message: string,
  ) {
    (async () => {
      try {
        const holders = await this.getTicketHolders(eventId);
        for (const holder of holders) {
          await this.emailService.sendEventPostponedEmail(holder.email, {
            firstName: holder.name,
            eventTitle: title,
            venue,
            oldDate: oldDate.toLocaleDateString('en-IN', { dateStyle: 'long' }),
            newDate: newDate.toLocaleDateString('en-IN', { dateStyle: 'long' }),
            message,
          });
        }
        this.logger.log(`Sent postpone emails to ${holders.length} ticket holders for "${title}"`);
      } catch (error) {
        this.logger.error(`Failed to send postpone notifications for event ${eventId}`, error);
      }
    })();
  }

  private async getTicketHolders(eventId: string): Promise<{ email: string; name: string }[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        items: { some: { eventId } },
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.REFUNDED] },
      },
      include: { user: { select: { email: true, firstName: true } } },
    });

    const holders: { email: string; name: string }[] = [];
    const seen = new Set<string>();

    for (const order of orders) {
      const email = order.user?.email || order.guestEmail;
      if (!email || seen.has(email)) continue;
      seen.add(email);
      holders.push({
        email,
        name: order.user?.firstName || order.guestName || 'Customer',
      });
    }

    return holders;
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.event.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }
}
