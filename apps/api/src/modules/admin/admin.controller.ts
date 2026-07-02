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
import { OrdersService } from '../orders/orders.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@thoovitickets/shared';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';

@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly pricingService: PricingService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('platform-config')
  getPlatformConfig() {
    return this.pricingService.getPlatformConfig();
  }

  @Patch('platform-config')
  @HttpCode(HttpStatus.OK)
  updatePlatformConfig(@Body() body: { defaultOrgCommission?: number; gstNumber?: string; panNumber?: string; companyName?: string; companyAddress?: string }) {
    const updates: Promise<unknown>[] = [];
    if (body.defaultOrgCommission !== undefined) updates.push(this.pricingService.updateDefaultOrgCommission(body.defaultOrgCommission));
    return Promise.all(updates).then(async () => {
      const config = await this.pricingService.getPlatformConfig();
      const updateData: Record<string, unknown> = {};
      if (body.gstNumber !== undefined) updateData.gstNumber = body.gstNumber;
      if (body.panNumber !== undefined) updateData.panNumber = body.panNumber;
      if (body.companyName !== undefined) updateData.companyName = body.companyName;
      if (body.companyAddress !== undefined) updateData.companyAddress = body.companyAddress;
      if (Object.keys(updateData).length > 0) {
        return this.adminService.updatePlatformConfig(config.id, updateData);
      }
      return config;
    });
  }

  @Patch('users/:id/commission')
  @HttpCode(HttpStatus.OK)
  updateOrgCommission(
    @Param('id') userId: string,
    @Body() body: { commissionPercent: number | null; commissionType?: string },
  ) {
    return this.pricingService.updateOrgCommission(userId, body.commissionPercent, body.commissionType || null);
  }

  @Patch('events/:id/commission')
  @HttpCode(HttpStatus.OK)
  async updateEventCommission(
    @Param('id') eventId: string,
    @Body() body: { commissionPercent: number | null; commissionType?: string },
  ) {
    return this.adminService.updateEventCommission(eventId, body.commissionPercent, body.commissionType || null);
  }

  @Get('events/:id/commission')
  async getEventCommission(@Param('id') eventId: string) {
    return this.adminService.getEventCommission(eventId);
  }

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ─── ORDERS ─────────────────────────────────

  @Get('orders')
  getOrders(
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getAdminOrders({
      status,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('orders/:id')
  getOrderDetail(@Param('id') orderId: string) {
    return this.ordersService.getAdminOrderDetail(orderId);
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

  @Get('events/:id')
  getEventDetail(@Param('id') eventId: string) {
    return this.adminService.getEventDetail(eventId);
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

  @Get('content-pages')
  getContentPages() {
    return this.adminService.getContentPages();
  }

  @Get('content-pages/:id')
  getContentPage(@Param('id') id: string) {
    return this.adminService.getContentPage(id);
  }

  @Patch('content-pages/:id')
  @HttpCode(HttpStatus.OK)
  updateContentPage(@Param('id') id: string, @CurrentUser('id') adminId: string, @Body() body: { title?: string; content?: string }) {
    return this.adminService.updateContentPage(id, adminId, body);
  }

  @Get('plans')
  getPlans() {
    return this.adminService.getPlans();
  }

  @Post('plans')
  createPlan(@Body() body: CreatePlanDto) {
    return this.adminService.createPlan(body);
  }

  @Patch('plans/:id')
  @HttpCode(HttpStatus.OK)
  updatePlan(@Param('id') id: string, @Body() body: UpdatePlanDto) {
    return this.adminService.updatePlan(id, body);
  }

  @Delete('plans/:id')
  @HttpCode(HttpStatus.OK)
  deletePlan(@Param('id') id: string) {
    return this.adminService.deletePlan(id);
  }

  @Post('payments/:id/mark-refunded')
  @HttpCode(HttpStatus.OK)
  markPaymentRefunded(@Param('id') id: string) {
    return this.adminService.markPaymentRefunded(id);
  }

  @Post('approvals/:id/review')
  @HttpCode(HttpStatus.OK)
  reviewEventAction(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: { action: 'APPROVED' | 'REJECTED'; reason?: string; notes?: string },
  ) {
    return this.adminService.reviewEventAction(id, adminId, dto as any);
  }

  @Get('convenience-fees')
  getConvenienceFeeSlabs() {
    return this.adminService.getConvenienceFeeSlabs();
  }

  @Post('convenience-fees')
  createConvenienceFeeSlab(
    @Body() body: { minAmount: number; maxAmount?: number | null; feeType: string; feeValue: number; isActive?: boolean },
  ) {
    return this.adminService.createConvenienceFeeSlab(body);
  }

  @Patch('convenience-fees/:id')
  @HttpCode(HttpStatus.OK)
  updateConvenienceFeeSlab(
    @Param('id') id: string,
    @Body() body: { minAmount?: number; maxAmount?: number | null; feeType?: string; feeValue?: number; isActive?: boolean },
  ) {
    return this.adminService.updateConvenienceFeeSlab(id, body);
  }

  @Delete('convenience-fees/:id')
  @HttpCode(HttpStatus.OK)
  deleteConvenienceFeeSlab(@Param('id') id: string) {
    return this.adminService.deleteConvenienceFeeSlab(id);
  }

  // ─── HOME BANNERS ─────────────────────────────────

  @Get('banners')
  getBanners() {
    return this.adminService.getBanners();
  }

  @Post('banners')
  createBanner(
    @Body() body: { title: string; description?: string; imageUrl: string; linkType?: string; linkUrl?: string; eventId?: string },
  ) {
    return this.adminService.createBanner(body);
  }

  @Patch('banners/:id')
  updateBanner(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; imageUrl?: string; linkType?: string; linkUrl?: string; eventId?: string; isActive?: boolean; sortOrder?: number },
  ) {
    return this.adminService.updateBanner(id, body);
  }

  @Patch('banners/reorder')
  reorderBanners(@Body() body: { ids: string[] }) {
    return this.adminService.reorderBanners(body.ids);
  }

  @Delete('banners/:id')
  @HttpCode(HttpStatus.OK)
  deleteBanner(@Param('id') id: string) {
    return this.adminService.deleteBanner(id);
  }

  // ─── TERMS ACCEPTANCES ─────────────────────────────

  @Get('terms-acceptances')
  getTermsAcceptances(
    @Query('audience') audience?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getTermsAcceptances({
      audience,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('terms-acceptances/:userId')
  getUserTermsAcceptances(@Param('userId') userId: string) {
    return this.adminService.getUserTermsAcceptances(userId);
  }
}
