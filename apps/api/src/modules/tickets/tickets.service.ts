import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QrService } from './qr.service';
import { InvoiceService } from './invoice.service';
import { EmailService } from '../email/email.service';
import { UploadService } from '../upload/upload.service';
import { TicketStatus } from '@thoovitickets/database';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qrService: QrService,
    private readonly invoiceService: InvoiceService,
    private readonly emailService: EmailService,
    private readonly uploadService: UploadService,
  ) {}

  async generateTicketsForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { ticketType: true, event: { include: { organiser: true } } } },
        user: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const existingTickets = await this.prisma.ticket.count({ where: { orderId } });
    if (existingTickets > 0) return;

    const attendees = (order.attendeeData as any[]) || [];
    const ticketsToCreate: any[] = [];

    for (const item of order.items) {
      const itemAttendees = attendees.filter((a: any) => a.ticketTypeId === item.ticketTypeId);
      const orgName = item.event.organiser?.orgName || `${item.event.organiser?.firstName || ''} ${item.event.organiser?.lastName || ''}`.trim() || 'TTX';
      const eventDate = new Date(item.event.startDate);

      for (let i = 0; i < item.quantity; i++) {
        const attendee = itemAttendees[i] || {
          name: order.user ? `${order.user.firstName} ${order.user.lastName}` : (order.guestName || 'Guest'),
          email: order.user?.email || order.guestEmail || '',
          phone: order.user?.phone || order.guestPhone || '',
        };

        const ticketCode = this.qrService.generateTicketCode(orgName, eventDate);
        const { qrData, qrDataUrl } = await this.qrService.generateQrDataUrl(ticketCode);

        ticketsToCreate.push({
          ticketCode,
          attendeeName: attendee.name,
          attendeeEmail: attendee.email,
          attendeePhone: attendee.phone,
          qrData,
          qrDataUrl,
          orderItemId: item.id,
          orderId: order.id,
        });
      }
    }

    await this.prisma.ticket.createMany({ data: ticketsToCreate });
    this.logger.log(`Generated ${ticketsToCreate.length} tickets for order ${order.orderNumber}`);
  }

  async generateAndStoreInvoice(orderId: string): Promise<string> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { ticketType: true, event: true } },
        user: true,
        payment: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    const pdfBuffer = await this.invoiceService.generateInvoice({
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' }),
      customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : (order.guestName || 'Guest'),
      customerEmail: order.user?.email || order.guestEmail || '',
      customerPhone: order.user?.phone || order.guestPhone || undefined,
      items: order.items.map((item) => ({
        eventTitle: item.event.title,
        ticketType: item.ticketType.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      subtotal: Number(order.subtotal),
      convenienceFee: Number(order.convenienceFee),
      platformFee: Number(order.platformFee),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      paymentStatus: order.payment?.status || 'PENDING',
    });

    const invoicePath = `invoices/${order.orderNumber}.pdf`;
    await this.uploadService.uploadBuffer('documents', pdfBuffer, 'application/pdf', invoicePath);

    await this.prisma.order.update({
      where: { id: orderId },
      data: { invoiceUrl: invoicePath },
    });

    this.logger.log(`Invoice generated for order ${order.orderNumber}`);
    return invoicePath;
  }

  async getInvoiceBuffer(orderId: string, userId?: string): Promise<Buffer> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { ticketType: true, event: true } }, user: true, payment: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId !== userId) throw new ForbiddenException('Access denied');

    return this.invoiceService.generateInvoice({
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' }),
      customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : (order.guestName || 'Guest'),
      customerEmail: order.user?.email || order.guestEmail || '',
      customerPhone: order.user?.phone || order.guestPhone || undefined,
      items: order.items.map((item) => ({
        eventTitle: item.event.title,
        ticketType: item.ticketType.name,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      subtotal: Number(order.subtotal),
      convenienceFee: Number(order.convenienceFee),
      platformFee: Number(order.platformFee),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      paymentStatus: order.payment?.status || 'PENDING',
    });
  }

  async sendTicketEmail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: { include: { orderItem: { include: { ticketType: true, event: true } } } },
        user: true,
        items: { include: { ticketType: true, event: true } },
        payment: true,
      },
    });

    if (!order || order.tickets.length === 0) return;

    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) return;

    const firstName = order.user?.firstName || order.guestName || 'Guest';
    const event = order.items[0]?.event;
    if (!event) return;

    const invoiceBuffer = await this.getInvoiceBuffer(orderId);

    try {
      await this.emailService.sendTicketConfirmationEmail(
        recipientEmail,
        {
          firstName,
          orderNumber: order.orderNumber,
          eventTitle: event.title,
          eventDate: new Date(event.startDate).toLocaleDateString('en-IN', { dateStyle: 'long' }),
          venue: event.venue,
          tickets: order.tickets.map((t) => ({
            attendeeName: t.attendeeName,
            ticketType: t.orderItem.ticketType.name,
            ticketCode: t.ticketCode,
            qrDataUrl: t.qrDataUrl || '',
          })),
        },
        invoiceBuffer,
      );
    } catch (error) {
      this.logger.error(`Failed to send ticket email for order ${order.orderNumber}`, error);
    }
  }

  async getTicketsByOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.ticket.findMany({
      where: { orderId },
      include: { orderItem: { include: { ticketType: true, event: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getTicketByCode(ticketCode: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        orderItem: { include: { ticketType: true, event: { select: { id: true, title: true, venue: true, startDate: true, endDate: true, organiserId: true } } } },
        order: { select: { orderNumber: true, status: true } },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async checkInTicket(ticketCode: string, organiserId: string) {
    const ticket = await this.getTicketByCode(ticketCode);

    if (ticket.orderItem.event.organiserId !== organiserId) {
      throw new ForbiddenException('Only the event organiser can check in tickets');
    }

    if (ticket.status === TicketStatus.USED) {
      throw new BadRequestException('Ticket already used');
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('Ticket is cancelled');
    }

    return this.prisma.ticket.update({
      where: { ticketCode },
      data: { status: TicketStatus.USED, checkedInAt: new Date() },
    });
  }
}
