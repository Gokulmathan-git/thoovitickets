export interface CreatePaymentOrderInput {
  orderId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  description: string;
}

export interface PaymentOrderResult {
  providerOrderId: string;
  amount: number;
  currency: string;
  provider: string;
  keyId?: string;
}

export interface VerifyPaymentInput {
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  providerPaymentId: string;
  providerOrderId: string;
}

export interface PaymentProvider {
  readonly name: string;
  createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<PaymentVerificationResult>;
  verifyWebhookSignature(body: string, signature: string): boolean;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
