import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

class VerifyPaymentDto {
  @IsString()
  providerPaymentId: string;

  @IsString()
  providerOrderId: string;

  @IsString()
  providerSignature: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate/:orderId')
  initiatePayment(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.paymentsService.initiatePayment(orderId, userId);
  }

  @Post('verify/:orderId')
  @HttpCode(HttpStatus.OK)
  verifyPayment(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(
      orderId,
      userId,
      dto.providerPaymentId,
      dto.providerOrderId,
      dto.providerSignature,
    );
  }

  @Public()
  @Get('provider')
  getProvider() {
    return { provider: this.paymentsService.getProviderName() };
  }
}
