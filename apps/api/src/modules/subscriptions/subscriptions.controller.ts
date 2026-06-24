import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { SubscriptionsService } from './subscriptions.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@thoovitickets/shared';

class SubscribeDto {
  @IsString()
  tier: string;

  @IsOptional()
  @IsBoolean()
  activateNow?: boolean;
}

class VerifyPaymentDto {
  @IsString()
  providerPaymentId: string;

  @IsString()
  providerOrderId: string;

  @IsString()
  providerSignature: string;
}

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Roles(UserRole.ORGANISER)
  @Get('my')
  getMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getActiveSubscription(userId);
  }

  @Roles(UserRole.ORGANISER)
  @Get('usage')
  getUsage(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getUsage(userId);
  }

  @Roles(UserRole.ORGANISER)
  @Post()
  subscribe(
    @CurrentUser('id') userId: string,
    @Body() body: SubscribeDto,
  ) {
    return this.subscriptionsService.subscribe(userId, body.tier, body.activateNow);
  }

  @Roles(UserRole.ORGANISER)
  @Post('initiate-payment')
  initiatePayment(
    @CurrentUser('id') userId: string,
    @Body() body: SubscribeDto,
  ) {
    return this.subscriptionsService.initiateSubscriptionPayment(userId, body.tier, body.activateNow);
  }

  @Roles(UserRole.ORGANISER)
  @Post('verify-payment')
  @HttpCode(HttpStatus.OK)
  verifyPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.subscriptionsService.verifySubscriptionPayment(
      userId,
      dto.providerPaymentId,
      dto.providerOrderId,
      dto.providerSignature,
    );
  }

  @Roles(UserRole.ORGANISER)
  @Post('renew')
  renew(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.renewSubscription(userId);
  }

  @Roles(UserRole.ORGANISER)
  @Post('verify-renewal')
  @HttpCode(HttpStatus.OK)
  verifyRenewal(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.subscriptionsService.verifyRenewalPayment(
      userId,
      dto.providerPaymentId,
      dto.providerOrderId,
      dto.providerSignature,
    );
  }

  @Roles(UserRole.ORGANISER)
  @Post('cancel-scheduled')
  @HttpCode(HttpStatus.OK)
  cancelScheduled(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancelScheduledPlan(userId);
  }

  @Roles(UserRole.ORGANISER)
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancelSubscription(userId);
  }
}
