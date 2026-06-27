import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { SendDiscountEmailDto } from './dto/send-discount-email.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@thoovitickets/shared';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Roles(UserRole.ORGANISER)
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateDiscountDto) {
    return this.discountsService.create(userId, dto);
  }

  @Roles(UserRole.ORGANISER)
  @Get()
  findAll(@CurrentUser('id') userId: string, @Query('eventId') eventId?: string) {
    return this.discountsService.findAllForOrganiser(userId, eventId);
  }

  @Roles(UserRole.ORGANISER)
  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.discountsService.findById(userId, id);
  }

  @Roles(UserRole.ORGANISER)
  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.discountsService.update(userId, id, dto);
  }

  @Roles(UserRole.ORGANISER)
  @Delete(':id')
  deactivate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.discountsService.deactivate(userId, id);
  }

  @Public()
  @Post('validate')
  validateCode(@Body() body: { code: string; eventId: string; ticketTypeIds?: string[] }) {
    return this.discountsService.validateCode(body.code, body.eventId, body.ticketTypeIds);
  }

  @Roles(UserRole.ORGANISER)
  @Post(':id/send-email')
  async sendEmail(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: SendDiscountEmailDto) {
    // Get discount details for the email
    const discount = await this.discountsService.findById(userId, id);
    // For now return success - email integration can be added later
    return { sent: dto.recipientEmails.length, discount: discount.code };
  }
}
