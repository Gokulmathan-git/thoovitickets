import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@thoovitickets/shared';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Roles(UserRole.ORGANISER)
  @Get('organiser')
  getOrganiserAnalytics(@CurrentUser('id') organiserId: string) {
    return this.analyticsService.getOrganiserAnalytics(organiserId);
  }
}
