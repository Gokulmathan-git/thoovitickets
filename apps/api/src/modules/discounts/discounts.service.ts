import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organiserId: string, dto: CreateDiscountDto) {
    // 1. Verify event belongs to organiser
    const event = await this.prisma.event.findFirst({
      where: { id: dto.eventId, organiserId },
    });
    if (!event) throw new NotFoundException('Event not found');

    // 2. Validate percentage <= 100
    if (dto.discountType === 'PERCENTAGE' && dto.value > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    // 3. Validate dates
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    const code = dto.code.toUpperCase();

    // 4. Check for existing active discount on same event with overlapping dates
    const scopeTicketIds =
      dto.ticketTypeIds && dto.ticketTypeIds.length > 0
        ? dto.ticketTypeIds
        : null;

    const conflicting = await this.prisma.discount.findMany({
      where: {
        eventId: dto.eventId,
        isActive: true,
        endDate: { gte: new Date(dto.startDate) },
        startDate: { lte: new Date(dto.endDate) },
      },
      include: { ticketTypes: true },
    });

    for (const existing of conflicting) {
      const existingScope = existing.ticketTypes.map((t) => t.ticketTypeId);
      const existingIsAll = existingScope.length === 0;
      const newIsAll = !scopeTicketIds;

      if (existingIsAll || newIsAll) {
        throw new BadRequestException(
          'An active discount "' +
            existing.code +
            '" already exists for this event with overlapping dates. Edit or deactivate it first.',
        );
      }

      const overlap = scopeTicketIds.filter((id) =>
        existingScope.includes(id),
      );
      if (overlap.length > 0) {
        throw new BadRequestException(
          'Discount "' +
            existing.code +
            '" already covers some of these ticket tiers. Edit or deactivate it first.',
        );
      }
    }

    // 5. Check code uniqueness for this event
    const existingCode = await this.prisma.discount.findUnique({
      where: { code_eventId: { code, eventId: dto.eventId } },
    });
    if (existingCode) {
      throw new BadRequestException(
        'Discount code "' + code + '" already exists for this event',
      );
    }

    // 6. Create
    return this.prisma.discount.create({
      data: {
        code,
        discountType: dto.discountType,
        value: dto.value,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        maxUses: dto.maxUses || null,
        isPublic: dto.isPublic ?? true,
        eventId: dto.eventId,
        organiserId,
        ticketTypes: scopeTicketIds
          ? {
              create: scopeTicketIds.map((ticketTypeId) => ({ ticketTypeId })),
            }
          : undefined,
      },
      include: {
        event: { select: { title: true } },
        ticketTypes: {
          include: { ticketType: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async update(
    organiserId: string,
    discountId: string,
    dto: UpdateDiscountDto,
  ) {
    const discount = await this.prisma.discount.findFirst({
      where: { id: discountId, organiserId },
    });
    if (!discount) throw new NotFoundException('Discount not found');

    if (
      dto.discountType === 'PERCENTAGE' &&
      (dto.value ?? Number(discount.value)) > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    const updateData: any = {};
    if (dto.discountType !== undefined)
      updateData.discountType = dto.discountType;
    if (dto.value !== undefined) updateData.value = dto.value;
    if (dto.startDate !== undefined)
      updateData.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) updateData.endDate = new Date(dto.endDate);
    if (dto.maxUses !== undefined) updateData.maxUses = dto.maxUses;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.isPublic !== undefined) updateData.isPublic = dto.isPublic;

    if (dto.ticketTypeIds !== undefined) {
      await this.prisma.discountTicketType.deleteMany({
        where: { discountId },
      });
      if (dto.ticketTypeIds.length > 0) {
        await this.prisma.discountTicketType.createMany({
          data: dto.ticketTypeIds.map((ticketTypeId) => ({
            discountId,
            ticketTypeId,
          })),
        });
      }
    }

    return this.prisma.discount.update({
      where: { id: discountId },
      data: updateData,
      include: {
        event: { select: { title: true } },
        ticketTypes: {
          include: { ticketType: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async findAllForOrganiser(organiserId: string, eventId?: string) {
    const where: any = { organiserId };
    if (eventId) where.eventId = eventId;

    return this.prisma.discount.findMany({
      where,
      include: {
        event: { select: { id: true, title: true } },
        ticketTypes: {
          include: { ticketType: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(organiserId: string, discountId: string) {
    const discount = await this.prisma.discount.findFirst({
      where: { id: discountId, organiserId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            ticketTypes: { select: { id: true, name: true } },
          },
        },
        ticketTypes: {
          include: { ticketType: { select: { id: true, name: true } } },
        },
      },
    });
    if (!discount) throw new NotFoundException('Discount not found');
    return discount;
  }

  async deactivate(organiserId: string, discountId: string) {
    const discount = await this.prisma.discount.findFirst({
      where: { id: discountId, organiserId },
    });
    if (!discount) throw new NotFoundException('Discount not found');

    return this.prisma.discount.update({
      where: { id: discountId },
      data: { isActive: false },
    });
  }

  async validateCode(
    code: string,
    eventId: string,
    ticketTypeIds?: string[],
  ) {
    const discount = await this.prisma.discount.findUnique({
      where: { code_eventId: { code: code.toUpperCase(), eventId } },
      include: {
        ticketTypes: true,
        event: { select: { title: true } },
      },
    });

    if (!discount) throw new BadRequestException('Invalid discount code');
    if (!discount.isActive)
      throw new BadRequestException('This discount code is no longer active');

    const now = new Date();
    if (now < discount.startDate)
      throw new BadRequestException('This discount code is not yet active');
    if (now > discount.endDate)
      throw new BadRequestException('This discount code has expired');
    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      throw new BadRequestException(
        'This discount code has reached its maximum usage limit',
      );
    }

    // Check ticket tier scope
    if (
      discount.ticketTypes.length > 0 &&
      ticketTypeIds &&
      ticketTypeIds.length > 0
    ) {
      const scopedIds = discount.ticketTypes.map((t) => t.ticketTypeId);
      const applicable = ticketTypeIds.filter((id) => scopedIds.includes(id));
      if (applicable.length === 0) {
        throw new BadRequestException(
          'This discount code does not apply to the selected tickets',
        );
      }
    }

    return {
      id: discount.id,
      code: discount.code,
      discountType: discount.discountType,
      value: Number(discount.value),
      eventId: discount.eventId,
      applicableTicketTypeIds:
        discount.ticketTypes.length > 0
          ? discount.ticketTypes.map((t) => t.ticketTypeId)
          : null,
    };
  }

  async incrementUsage(discountId: string) {
    await this.prisma.discount.update({
      where: { id: discountId },
      data: { usedCount: { increment: 1 } },
    });
  }

  async getActiveDiscountsForEvent(eventId: string) {
    const now = new Date();
    const discounts = await this.prisma.discount.findMany({
      where: {
        eventId,
        isActive: true,
        isPublic: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        ticketTypes: { select: { ticketTypeId: true } },
      },
    });
    // Filter out those that exceeded maxUses
    return discounts.filter((d) => !d.maxUses || d.usedCount < d.maxUses);
  }
}
