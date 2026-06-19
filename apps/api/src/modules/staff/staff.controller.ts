import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { StaffService } from './staff.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@thoovitickets/shared';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Roles(UserRole.ORGANISER)
  @Get()
  getMyStaff(@CurrentUser('id') organiserId: string) {
    return this.staffService.getMyStaff(organiserId);
  }

  @Roles(UserRole.ORGANISER)
  @Post()
  addStaff(
    @CurrentUser('id') organiserId: string,
    @Body() body: { email: string; accessLevel: string },
  ) {
    return this.staffService.addStaff(organiserId, body.email, body.accessLevel as any);
  }

  @Roles(UserRole.ORGANISER)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  updateStaff(
    @CurrentUser('id') organiserId: string,
    @Param('id') staffId: string,
    @Body() body: { accessLevel?: string; isActive?: boolean },
  ) {
    return this.staffService.updateStaff(organiserId, staffId, body as any);
  }

  @Roles(UserRole.ORGANISER)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  removeStaff(
    @CurrentUser('id') organiserId: string,
    @Param('id') staffId: string,
  ) {
    return this.staffService.removeStaff(organiserId, staffId);
  }

  @Get('my-access')
  getMyAccess(@CurrentUser('id') userId: string) {
    return this.staffService.getMyAccess(userId);
  }
}
