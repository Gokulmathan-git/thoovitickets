import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@thoovitickets/database';
import {
  PaymentProvider,
  PAYMENT_PROVIDER,
} from './providers/payment-provider.interface';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
    private readonly ticketsService: TicketsService,
  ) {}

  async initiateGuestPayment(orderId: string, guestEmail: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, guestEmail, userId: null },
      include: {
        items: {
          include: {
            event: { select: { title: true } },
            ticketType: { select: { name: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this._initiatePaymentForOrder(order);
  }

  async verifyGuestPayment(
    orderId: string,
    guestEmail: string,
    providerPaymentId: string,
    providerOrderId: string,
    providerSignature: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, guestEmail, userId: null },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this._verifyPaymentForOrder(order, providerPaymentId, providerOrderId, providerSignature);
  }

  async initiatePayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        items: {
          include: {
            event: { select: { title: true } },
            ticketType: { select: { name: true } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return this._initiatePaymentForOrder(order);
  }

  async verifyPayment(
    orderId: string,
    userId: string,
    providerPaymentId: string,
    providerOrderId: string,
    providerSignature: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this._verifyPaymentForOrder(order, providerPaymentId, providerOrderId, providerSignature);
  }

  private async _initiatePaymentForOrder(order: any) {
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in pending status');
    }

    if (order.expiresAt && new Date() > order.expiresAt) {
      throw new BadRequestException('Order has expired. Please create a new order.');
    }

    const existing = await this.prisma.payment.findUnique({
      where: { orderId: order.id },
    });
    if (existing && existing.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Payment already completed');
    }

    const description = order.items
      .map((i: any) => `${i.ticketType.name} x${i.quantity} - ${i.event.title}`)
      .join(', ');

    const result = await this.paymentProvider.createOrder({
      orderId: order.id,
      amount: Number(order.totalAmount),
      currency: order.currency,
      customerName: `${order.user?.firstName || order.guestName || 'Guest'} ${order.user?.lastName || ''}`.trim(),
      customerEmail: order.user?.email || order.guestEmail || '',
      customerPhone: order.user?.phone || order.guestPhone || undefined,
      description,
    });

    if (existing) {
      await this.prisma.payment.update({
        where: { orderId: order.id },
        data: {
          providerOrderId: result.providerOrderId,
          provider: result.provider,
          status: PaymentStatus.PENDING,
        },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          currency: order.currency,
          provider: result.provider,
          providerOrderId: result.providerOrderId,
          status: PaymentStatus.PENDING,
        },
      });
    }

    return {
      providerOrderId: result.providerOrderId,
      amount: Number(order.totalAmount),
      currency: order.currency,
      provider: result.provider,
      keyId: result.keyId,
      orderNumber: order.orderNumber,
      prefill: {
        name: `${order.user?.firstName || order.guestName || ''} ${order.user?.lastName || ''}`.trim(),
        email: order.user?.email || order.guestEmail || '',
        contact: order.user?.phone || order.guestPhone || '',
      },
    };
  }

  private async _verifyPaymentForOrder(
    order: any,
    providerPaymentId: string,
    providerOrderId: string,
    providerSignature: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: order.id },
    });
    if (!payment) throw new NotFoundException('Payment record not found');

    const verification = await this.paymentProvider.verifyPayment({
      providerOrderId,
      providerPaymentId,
      providerSignature,
    });

    if (!verification.verified) {
      await this.prisma.payment.update({
        where: { orderId: order.id },
        data: {
          status: PaymentStatus.FAILED,
          providerPaymentId,
          failureReason: 'Signature verification failed',
        },
      });
      throw new BadRequestException('Payment verification failed');
    }

    const [updatedOrder] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CONFIRMED, expiresAt: null },
      }),
      this.prisma.payment.update({
        where: { orderId: order.id },
        data: {
          status: PaymentStatus.SUCCESS,
          providerPaymentId,
          metadata: { signature: providerSignature },
        },
      }),
    ]);

    this.generateTicketsAsync(order.id);

    return {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      paymentStatus: 'SUCCESS',
    };
  }

  private generateTicketsAsync(orderId: string) {
    (async () => {
      try {
        await this.ticketsService.generateTicketsForOrder(orderId);
        await this.ticketsService.generateAndStoreInvoice(orderId);
        await this.ticketsService.sendTicketEmail(orderId);
      } catch (error) {
        this.logger.error(`Failed to generate tickets for order ${orderId}`, error);
      }
    })();
  }

  getProviderName(): string {
    return this.paymentProvider.name;
  }
}
