import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole } from '@thoovitickets/database';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  status: true,
  emailVerified: true,
  avatarUrl: true,
  orgName: true,
  orgDescription: true,
  idDocumentUrl: true,
  idDocumentType: true,
  profileCompleted: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        profileCompleted: undefined,
      },
      select: { ...USER_SELECT, role: true },
    });

    if (user.role === UserRole.ORGANISER) {
      const isComplete = !!(
        user.firstName &&
        user.lastName &&
        user.orgName &&
        user.avatarUrl &&
        user.idDocumentUrl &&
        user.idDocumentType &&
        user.emailVerified
      );

      if (isComplete !== user.profileCompleted) {
        const updated = await this.prisma.user.update({
          where: { id: userId },
          data: { profileCompleted: isComplete },
          select: USER_SELECT,
        });
        return updated;
      }
    }

    return user;
  }
}
