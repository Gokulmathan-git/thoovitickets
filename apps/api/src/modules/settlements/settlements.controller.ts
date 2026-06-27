import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@thoovitickets/shared';
import { SettlementStatus } from '@thoovitickets/database';

@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get('summary')
  @Roles(UserRole.ORGANISER)
  getOrganiserSummary(@CurrentUser('id') organiserId: string) {
    return this.settlementsService.getOrganiserSummary(organiserId);
  }

  @Get('event/:eventId')
  @Roles(UserRole.ORGANISER)
  getEventSettlementDetail(
    @CurrentUser('id') organiserId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.settlementsService.getEventSettlementDetail(organiserId, eventId);
  }

  @Post('request/:eventId')
  @Roles(UserRole.ORGANISER)
  requestSettlement(
    @CurrentUser('id') organiserId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.settlementsService.requestSettlement(organiserId, eventId);
  }

  @Get('my')
  @Roles(UserRole.ORGANISER)
  getMySettlements(@CurrentUser('id') organiserId: string) {
    return this.settlementsService.getMySettlements(organiserId);
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  getAllSettlements(@Query('status') status?: SettlementStatus) {
    return this.settlementsService.getAllSettlements(status);
  }

  @Get('admin/:id')
  @Roles(UserRole.ADMIN)
  getSettlementById(@Param('id') id: string) {
    return this.settlementsService.getSettlementById(id);
  }

  @Post('admin/:id/process')
  @Roles(UserRole.ADMIN)
  processSettlement(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; transactionRef?: string; rejectionReason?: string },
  ) {
    return this.settlementsService.processSettlement(id, body.action, {
      transactionRef: body.transactionRef,
      rejectionReason: body.rejectionReason,
    });
  }
}
