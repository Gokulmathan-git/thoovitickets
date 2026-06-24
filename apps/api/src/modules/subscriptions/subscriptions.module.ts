import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PAYMENT_PROVIDER } from '../payments/providers/payment-provider.interface';
import { RazorpayProvider } from '../payments/providers/razorpay.provider';
import { MockPaymentProvider } from '../payments/providers/mock.provider';

@Module({
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const razorpayKeyId = configService.get<string>('RAZORPAY_KEY_ID');
        if (razorpayKeyId) {
          return new RazorpayProvider(configService);
        }
        return new MockPaymentProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
