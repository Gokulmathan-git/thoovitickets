import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@thoovitickets/database';
import {
  PaymentProvider,
  PAYMENT_PROVIDER,
} from './providers/payment-provider.interface';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

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
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Order is not in pending status');
    }

    if (order.expiresAt && new Date() > order.expiresAt) {
      throw new BadRequestException('Order has expired. Please create a new order.');
    }

    const existing = await this.prisma.payment.findUnique({
      where: { orderId },
    });
    if (existing && existing.status === PaymentStatus.SUCCESS) {
      throw new BadRequestException('Payment already completed');
    }

    const description = order.items
      .map((i) => `${i.ticketType.name} x${i.quantity} - ${i.event.title}`)
      .join(', ');

    const result = await this.paymentProvider.createOrder({
      orderId: order.id,
      amount: Number(order.totalAmount),
      currency: order.currency,
      customerName: `${order.user?.firstName || 'Guest'} ${order.user?.lastName || ''}`.trim(),
      customerEmail: order.user?.email || order.guestEmail || '',
      customerPhone: order.user?.phone || order.guestPhone || undefined,
      description,
    });

    if (existing) {
      await this.prisma.payment.update({
        where: { orderId },
        data: {
          providerOrderId: result.providerOrderId,
          provider: result.provider,
          status: PaymentStatus.PENDING,
        },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          orderId,
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
        name: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim(),
        email: order.user?.email || order.guestEmail || '',
        contact: order.user?.phone || order.guestPhone || '',
      },
    };
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

    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });
    if (!payment) throw new NotFoundException('Payment record not found');

    const verification = await this.paymentProvider.verifyPayment({
      providerOrderId,
      providerPaymentId,
      providerSignature,
    });

    if (!verification.verified) {
      await this.prisma.payment.update({
        where: { orderId },
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
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMED, expiresAt: null },
      }),
      this.prisma.payment.update({
        where: { orderId },
        data: {
          status: PaymentStatus.SUCCESS,
          providerPaymentId,
          metadata: { signature: providerSignature },
        },
      }),
    ]);

    return {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status,
      paymentStatus: 'SUCCESS',
    };
  }

  getProviderName(): string {
    return this.paymentProvider.name;
  }
}
