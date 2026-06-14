import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@thoovitickets/shared';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('admin')
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
