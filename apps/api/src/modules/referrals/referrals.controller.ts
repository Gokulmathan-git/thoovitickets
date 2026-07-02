import { Controller, Get, Post, Patch, Body, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@thoovitickets/shared';
import { AdminUpdateReferralDto, AdminCreditPointsDto, AdminDebitPointsDto } from './dto/referral.dto';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('my-referrals')
  @Roles(UserRole.ORGANISER)
  async getMyReferrals(@CurrentUser('id') userId: string) {
    return this.referralsService.getMyReferrals(userId);
  }

  @Get('my-wallet')
  @Roles(UserRole.ORGANISER)
  async getMyWallet(@CurrentUser('id') userId: string) {
    return this.referralsService.getMyWallet(userId);
  }

  @Post('generate-code')
  @Roles(UserRole.ORGANISER)
  async generateCode(@CurrentUser('id') userId: string) {
    const code = await this.referralsService.ensureReferralCode(userId);
    return { referralCode: code };
  }

  // ── Admin endpoints ──

  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  async adminGetAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.referralsService.adminGetAllReferrals(page, limit, status);
  }

  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  async adminGetStats() {
    return this.referralsService.adminGetReferralStats();
  }

  @Patch('admin/:id')
  @Roles(UserRole.ADMIN)
  async adminUpdateReferral(@Param('id') id: string, @Body() dto: AdminUpdateReferralDto) {
    return this.referralsService.adminUpdateReferral(id, dto.status, dto.rejectionReason);
  }

  @Post('admin/credit-points')
  @Roles(UserRole.ADMIN)
  async adminCreditPoints(@Body() dto: AdminCreditPointsDto) {
    return this.referralsService.adminCreditPoints(dto.userId, dto.points, dto.description);
  }

  @Post('admin/debit-points')
  @Roles(UserRole.ADMIN)
  async adminDebitPoints(@Body() dto: AdminDebitPointsDto) {
    return this.referralsService.adminDebitPoints(dto.userId, dto.points, dto.description);
  }

  @Get('admin/wallets')
  @Roles(UserRole.ADMIN)
  async adminGetWallets(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.referralsService.adminGetWallets(page, limit);
  }
}
