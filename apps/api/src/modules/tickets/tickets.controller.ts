import { Controller, Get, Post, Param, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { TicketsService } from './tickets.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@thoovitickets/shared';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('order/:orderId')
  getTicketsByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ticketsService.getTicketsByOrder(orderId, userId);
  }

  @Get('order/:orderId/invoice')
  async downloadInvoice(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.ticketsService.getInvoiceBuffer(orderId, userId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${orderId}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('order/:orderId/send-email')
  @HttpCode(HttpStatus.OK)
  async resendTicketEmail(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    const order = await this.ticketsService.getTicketsByOrder(orderId, userId);
    if (order.length === 0) return { message: 'No tickets found for this order' };
    await this.ticketsService.sendTicketEmail(orderId);
    return { message: 'Ticket email sent' };
  }

  @Public()
  @Get('verify/:ticketCode')
  getTicketByCode(@Param('ticketCode') ticketCode: string) {
    return this.ticketsService.getTicketByCode(ticketCode);
  }

  @Roles(UserRole.ORGANISER)
  @Post(':ticketCode/check-in')
  @HttpCode(HttpStatus.OK)
  checkInTicket(
    @Param('ticketCode') ticketCode: string,
    @CurrentUser('id') organiserId: string,
  ) {
    return this.ticketsService.checkInTicket(ticketCode, organiserId);
  }
}
