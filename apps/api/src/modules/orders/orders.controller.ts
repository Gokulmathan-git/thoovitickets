import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { OrdersService } from './orders.service';
import { PricingService } from '../pricing/pricing.service';
import { DiscountsService } from '../discounts/discounts.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateGuestOrderDto } from './dto/create-guest-order.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@thoovitickets/shared';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly pricingService: PricingService,
    private readonly discountsService: DiscountsService,
    private readonly ticketsService: TicketsService,
  ) {}

  @Public()
  @Post('price-breakdown')
  @HttpCode(HttpStatus.OK)
  async getPriceBreakdown(
    @Body() body: { items: { ticketTypeId: string; quantity: number }[]; discountCode?: string; eventId?: string },
  ) {
    let discountInfo;
    if (body.discountCode && body.eventId) {
      const ticketTypeIds = body.items.map((i) => i.ticketTypeId);
      discountInfo = await this.discountsService.validateCode(body.discountCode, body.eventId, ticketTypeIds);
    }
    return this.pricingService.calculatePriceBreakdown(body.items, undefined, undefined, discountInfo);
  }

  @Post()
  createOrder(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.ordersService.createFromCart(userId, dto);
  }

  @Public()
  @Post('guest')
  createGuestOrder(@Body() dto: CreateGuestOrderDto) {
    return this.ordersService.createGuestOrder(dto);
  }

  @Public()
  @Post('guest/:id/confirm')
  @HttpCode(HttpStatus.OK)
  confirmGuestOrder(@Param('id') orderId: string, @Body('guestEmail') guestEmail: string) {
    return this.ordersService.confirmGuestOrder(orderId, guestEmail);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  confirmOrder(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.ordersService.confirmOrder(orderId, userId);
  }

  @Public()
  @Post('guest/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelGuestOrder(@Param('id') orderId: string, @Body('guestEmail') guestEmail: string) {
    return this.ordersService.cancelGuestOrder(orderId, guestEmail);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelOrder(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.ordersService.cancelOrder(orderId, userId);
  }

  // ─── ORGANISER ENDPOINTS ─────────────────────────────

  @Get('organiser')
  @Roles(UserRole.ORGANISER)
  getOrganiserOrders(
    @CurrentUser('id') userId: string,
    @Query('eventId') eventId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getOrganiserOrders(userId, {
      eventId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('organiser/event/:eventId/attendees')
  @Roles(UserRole.ORGANISER)
  getEventAttendees(
    @CurrentUser('id') userId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.ordersService.getEventAttendees(userId, eventId);
  }

  @Get('organiser/event/:eventId/attendees/export')
  @Roles(UserRole.ORGANISER)
  async exportAttendeesCsv(
    @CurrentUser('id') userId: string,
    @Param('eventId') eventId: string,
    @Res() res: Response,
  ) {
    const data = await this.ordersService.getEventAttendees(userId, eventId);

    const header = 'Name,Email,Phone,Ticket Type,Ticket Code,Status,Checked In At\n';
    const rows = data.attendees.map((a: Record<string, unknown>) =>
      [
        `"${(a.attendeeName as string || '').replace(/"/g, '""')}"`,
        a.attendeeEmail,
        a.attendeePhone || '',
        a.ticketTypeName,
        a.ticketCode,
        a.status,
        a.checkedInAt ? new Date(a.checkedInAt as string).toLocaleString('en-IN') : '',
      ].join(','),
    ).join('\n');

    const csv = header + rows;
    const eventTitle = (data.event?.title || 'attendees').replace(/[^a-zA-Z0-9]/g, '_');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${eventTitle}_attendees.csv"`);
    res.send(csv);
  }

  @Get('organiser/:orderId')
  @Roles(UserRole.ORGANISER)
  getOrganiserOrderDetail(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.getOrganiserOrderDetail(userId, orderId);
  }

  @Post('organiser/:orderId/resend-tickets')
  @Roles(UserRole.ORGANISER)
  @HttpCode(HttpStatus.OK)
  async resendTickets(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    // Verify the order belongs to the organiser's events
    await this.ordersService.getOrganiserOrderDetail(userId, orderId);
    await this.ticketsService.sendTicketEmail(orderId);
    return { message: 'Tickets resent successfully' };
  }

  // ─── CUSTOMER ENDPOINTS ─────────────────────────────

  @Get()
  getMyOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  @Get(':id')
  getOrderById(@Param('id') orderId: string, @CurrentUser('id') userId: string) {
    return this.ordersService.getOrderById(orderId, userId);
  }
}
