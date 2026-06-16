import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { PricingService } from '../pricing/pricing.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@thoovitickets/shared';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly pricingService: PricingService,
  ) {}

  @Get('platform-config')
  getPlatformConfig() {
    return this.pricingService.getPlatformConfig();
  }

  @Patch('platform-config')
  @HttpCode(HttpStatus.OK)
  updatePlatformConfig(@Body() body: { platformFeePercent?: number; defaultOrgCommission?: number }) {
    const updates: Promise<unknown>[] = [];
    if (body.platformFeePercent !== undefined) updates.push(this.pricingService.updatePlatformFee(body.platformFeePercent));
    if (body.defaultOrgCommission !== undefined) updates.push(this.pricingService.updateDefaultOrgCommission(body.defaultOrgCommission));
    return Promise.all(updates).then(() => this.pricingService.getPlatformConfig());
  }

  @Patch('users/:id/commission')
  @HttpCode(HttpStatus.OK)
  updateOrgCommission(@Param('id') userId: string, @Body('commissionPercent') commissionPercent: number) {
    return this.pricingService.updateOrgCommission(userId, commissionPercent);
  }

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  getUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers({
      role,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  updateUserStatus(
    @Param('id') userId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(userId, adminId, dto);
  }

  @Get('events')
  getEvents(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getEvents({
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('events/:id/review')
  @HttpCode(HttpStatus.OK)
  reviewEvent(
    @Param('id') eventId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.adminService.updateEventStatus(eventId, adminId, dto);
  }

  @Get('approvals')
  getPendingApprovals() {
    return this.adminService.getPendingApprovals();
  }

  @Get('categories')
  getCategories() {
    return this.adminService.getCategories();
  }

  @Post('categories')
  createCategory(@Body() body: { name: string; slug: string; icon?: string; description?: string; sortOrder?: number }) {
    return this.adminService.createCategory(body);
  }

  @Patch('categories/:id')
  @HttpCode(HttpStatus.OK)
  updateCategory(@Param('id') id: string, @Body() body: { name?: string; icon?: string; description?: string; isActive?: boolean; sortOrder?: number }) {
    return this.adminService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }
}
