import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  CreatePaymentOrderInput,
  PaymentOrderResult,
  VerifyPaymentInput,
  PaymentVerificationResult,
} from './payment-provider.interface';

@Injectable()
export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.keyId = this.configService.getOrThrow<string>('RAZORPAY_KEY_ID');
    this.keySecret = this.configService.getOrThrow<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || this.keySecret;
  }

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    // Razorpay expects amount in paise (smallest currency unit)
    const amountInPaise = Math.round(input.amount * 100);

    const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: input.currency,
        receipt: input.orderId.slice(0, 40),
        notes: {
          orderId: input.orderId,
          description: input.description,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Razorpay order creation failed: ${JSON.stringify(error)}`);
    }

    const data = (await response.json()) as { id: string };

    return {
      providerOrderId: data.id,
      amount: input.amount,
      currency: input.currency,
      provider: this.name,
      keyId: this.keyId,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    const body = `${input.providerOrderId}|${input.providerPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    return {
      verified: expectedSignature === input.providerSignature,
      providerPaymentId: input.providerPaymentId,
      providerOrderId: input.providerOrderId,
    };
  }

  verifyWebhookSignature(body: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }
}
