import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '@thoovitickets/shared';
import { PlanTier } from './subscription-plans';

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
    return this.subscriptionsService.checkEventLimit(userId);
  }

  @Roles(UserRole.ORGANISER)
  @Post()
  subscribe(@CurrentUser('id') userId: string, @Body() dto: SubscribeDto) {
    return this.subscriptionsService.subscribe(userId, dto.tier as PlanTier);
  }

  @Roles(UserRole.ORGANISER)
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.cancelSubscription(userId);
  }
}
