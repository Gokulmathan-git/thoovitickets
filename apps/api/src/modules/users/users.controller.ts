import { Controller, Get, Patch, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('profile')
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('request-reactivation')
  @HttpCode(HttpStatus.OK)
  async requestReactivation(
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'SUSPENDED') {
      throw new BadRequestException('Only suspended accounts can request reactivation');
    }

    const existing = await this.prisma.adminApproval.findFirst({
      where: { requesterId: userId, type: 'USER_REACTIVATION', action: 'PENDING' },
    });
    if (existing) throw new BadRequestException('A reactivation request is already pending');

    await this.prisma.adminApproval.create({
      data: {
        type: 'USER_REACTIVATION' as any,
        action: 'PENDING',
        reason,
        requesterId: userId,
      },
    });

    return { message: 'Reactivation request submitted. Admin will review it.' };
  }

  @Post('request-reapproval')
  @HttpCode(HttpStatus.OK)
  async requestReapproval(
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'REJECTED') {
      throw new BadRequestException('Only rejected accounts can request re-approval');
    }

    const existing = await this.prisma.adminApproval.findFirst({
      where: { requesterId: userId, type: 'USER_REACTIVATION', action: 'PENDING' },
    });
    if (existing) throw new BadRequestException('A re-approval request is already pending');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status: 'PENDING', statusReason: null },
      }),
      this.prisma.adminApproval.create({
        data: {
          type: 'USER_REACTIVATION' as any,
          action: 'PENDING',
          reason,
          requesterId: userId,
        },
      }),
    ]);

    return { message: 'Re-approval request submitted. Your account is under review again.' };
  }
}
