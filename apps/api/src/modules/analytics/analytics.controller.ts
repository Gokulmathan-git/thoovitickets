import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@thoovitickets/shared';
import { Public } from '../auth/decorators/public.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles(UserRole.ORGANISER)
  @Get('organiser/dashboard')
  getOrganiserDashboard(@CurrentUser('id') organiserId: string) {
    return this.analyticsService.getOrganiserDashboard(organiserId);
  }

  @Roles(UserRole.ORGANISER)
  @Get('organiser')
  getOrganiserAnalytics(@CurrentUser('id') organiserId: string) {
    return this.analyticsService.getOrganiserAnalytics(organiserId);
  }

  @Get('event/:eventId')
  getEventMetrics(@Param('eventId') eventId: string) {
    return this.analyticsService.getEventMetrics(eventId);
  }
}
