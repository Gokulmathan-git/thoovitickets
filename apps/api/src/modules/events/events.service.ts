import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { EventStatus, Prisma } from '@thoovitickets/database';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async create(organiserId: string, dto: CreateEventDto) {
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

    const maxTickets = await this.subscriptionsService.checkTicketLimit(organiserId);
    for (const tt of dto.ticketTypes) {
      if (tt.totalQty > maxTickets) {
        throw new BadRequestException(
          `Ticket quantity ${tt.totalQty} exceeds your plan limit of ${maxTickets} per event. Upgrade your subscription.`,
        );
      }
    }

    const category = await this.prisma.eventCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new BadRequestException('Invalid category');

    const slug = await this.generateUniqueSlug(dto.title);

    const { ticketTypes, ...eventData } = dto;

    return this.prisma.event.create({
      data: {
        ...eventData,
        slug,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        organiserId,
        status: EventStatus.DRAFT,
        tags: dto.tags || [],
        country: dto.country || 'India',
        ticketTypes: {
          create: ticketTypes.map((tt, index) => ({
            name: tt.name,
            description: tt.description,
            price: tt.price,
            currency: tt.currency || 'INR',
            totalQty: tt.totalQty,
            maxPerOrder: tt.maxPerOrder || 10,
            saleStart: tt.saleStart ? new Date(tt.saleStart) : null,
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
    return this.prisma.event.findMany({
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
    });
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
          select: { id: true, firstName: true, lastName: true, orgName: true },
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
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) throw new NotFoundException('Event not found');
    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You can only edit your own events');
    }
    if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.REJECTED) {
      throw new BadRequestException('Only draft or rejected events can be edited');
    }

    const updateData: Record<string, unknown> = { ...dto };
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

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
      if (sub.tier !== 'PREMIUM' && sub.tier !== 'ENTERPRISE') {
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
