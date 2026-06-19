import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { MobileService } from './mobile.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: { email: string; password: string }) {
    return this.mobileService.login(body.email, body.password);
  }

  @Get('events')
  getEvents(@CurrentUser() user: { sub: string; role: string }) {
    return this.mobileService.getEvents(user.sub, user.role);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: { sub: string; role: string }) {
    return this.mobileService.getDashboard(user.sub, user.role);
  }

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  scanTicket(
    @Body('ticketCode') ticketCode: string,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.mobileService.scanTicket(ticketCode, user.sub, user.role);
  }

  @Post('check-in')
  @HttpCode(HttpStatus.OK)
  checkInMultiple(
    @Body('ticketIds') ticketIds: string[],
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.mobileService.checkInMultiple(ticketIds, user.sub, user.role);
  }

  @Post('check-in/:ticketId')
  @HttpCode(HttpStatus.OK)
  checkInSingle(
    @Param('ticketId') ticketId: string,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.mobileService.checkInSingle(ticketId, user.sub, user.role);
  }
}
