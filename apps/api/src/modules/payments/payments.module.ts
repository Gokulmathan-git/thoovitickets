import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import { MockPaymentProvider } from './providers/mock.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TicketsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
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
  exports: [PaymentsService],
})
export class PaymentsModule {}
