import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  CreatePaymentOrderInput,
  PaymentOrderResult,
  VerifyPaymentInput,
  PaymentVerificationResult,
} from './payment-provider.interface';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  private readonly secret = 'mock_webhook_secret';

  async createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult> {
    const providerOrderId = `mock_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      providerOrderId,
      amount: input.amount,
      currency: input.currency,
      provider: this.name,
      keyId: 'mock_key_id',
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult> {
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(`${input.providerOrderId}|${input.providerPaymentId}`)
      .digest('hex');

    return {
      verified: input.providerSignature === expectedSignature || input.providerSignature === 'mock_valid_signature',
      providerPaymentId: input.providerPaymentId,
      providerOrderId: input.providerOrderId,
    };
  }

  verifyWebhookSignature(_body: string, _signature: string): boolean {
    return true;
  }

  generateMockSignature(orderId: string, paymentId: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }
}
