import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, UserStatus } from '@thoovitickets/database';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_MS = 15 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, val] of this.loginAttempts) {
        if (now - val.lastAttempt > this.LOCKOUT_MS) this.loginAttempts.delete(key);
      }
    }, 5 * 60 * 1000);
  }

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (dto.role === 'ORGANISER' && !dto.orgName) {
      throw new BadRequestException('Organisation name is required for organisers');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      if (existingUser.role !== dto.role) {
        const registeredAs = existingUser.role === UserRole.ORGANISER ? 'an organiser' : 'a customer';
        throw new ConflictException(`This email is already registered as ${registeredAs}. Please use a different email.`);
      }
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    const isOrganiser = dto.role === 'ORGANISER';

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone || null,
        role: dto.role as UserRole,
        status: isOrganiser ? UserStatus.PENDING : UserStatus.ACTIVE,
        orgName: dto.orgName || null,
        orgDescription: dto.orgDescription || null,
        emailVerificationToken: hashedVerificationToken,
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    if (isOrganiser) {
      await this.prisma.adminApproval.create({
        data: {
          type: 'USER_REGISTRATION' as any,
          action: 'PENDING',
          reason: 'New organiser registration — awaiting profile completion and admin review',
          requesterId: user.id,
        },
      });
    }

    const audience = isOrganiser ? 'organiser' : 'customer';
    const termsPage = await this.prisma.contentPage.findUnique({
      where: { slug_audience: { slug: 'terms-of-service', audience } },
    });

    if (termsPage) {
      await this.prisma.termsAcceptance.create({
        data: {
          userId: user.id,
          contentPageId: termsPage.id,
          contentVersion: termsPage.updatedAt,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    }

    await this.emailService.sendVerificationEmail(
      user.email,
      user.firstName,
      verificationToken,
    );

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: user.role === UserRole.ORGANISER
        ? 'Registration successful. Please verify your email and complete your profile.'
        : 'Registration successful. A verification link has been sent to your email.',
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const attempt = this.loginAttempts.get(email);
    if (attempt && attempt.count >= this.MAX_ATTEMPTS && Date.now() - attempt.lastAttempt < this.LOCKOUT_MS) {
      const minutesLeft = Math.ceil((this.LOCKOUT_MS - (Date.now() - attempt.lastAttempt)) / 60000);
      throw new ForbiddenException(`Too many failed login attempts. Please try again in ${minutesLeft} minutes.`);
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.recordFailedAttempt(email);
      throw new UnauthorizedException('This email is not registered.\nPlease create an account first.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.recordFailedAttempt(email);
      throw new UnauthorizedException('Incorrect password. Please try again or use "Forgot password" to reset it.');
    }

    this.loginAttempts.delete(email);

    if (!user.emailVerified && user.role === UserRole.ORGANISER) {
      throw new ForbiddenException('Please verify your email before logging in. Check your inbox for the verification link.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isRefreshTokenValid) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      role: user.role,
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new UnauthorizedException('User not found');

    return this.sanitizeUser(user);
  }

  async verifyEmail(token: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Invalid or expired verification link. Please request a new one.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'Email verified successfully.',
      user: this.sanitizeUser({ ...user, emailVerified: true }),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || user.emailVerified) {
      return { message: 'If an unverified account exists with this email, a new verification link has been sent.' };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.emailService.sendVerificationEmail(user.email, user.firstName, verificationToken);

    return { message: 'If an unverified account exists with this email, a new verification link has been sent.' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user) return { message: 'If an account exists with this email, a reset link has been sent.' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await this.emailService.sendPasswordResetEmail(user.email, user.firstName, resetToken);

    return { message: 'If an account exists with this email, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gte: new Date() },
      },
    });

    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        refreshToken: null, // Invalidate all sessions
      },
    });

    return { message: 'Password reset successfully. Please log in.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  private getRefreshExpiryByRole(role: string): string {
    switch (role) {
      case 'ADMIN': return this.configService.get<string>('jwt.refreshExpiryAdmin') ?? '5h';
      case 'ORGANISER': return this.configService.get<string>('jwt.refreshExpiryOrganiser') ?? '12h';
      default: return this.configService.get<string>('jwt.refreshExpiryCustomer') ?? '24h';
    }
  }

  getRefreshMaxAgeByRole(role: string): number {
    const expiry = this.getRefreshExpiryByRole(role);
    const match = expiry.match(/^(\d+)(h|m|d)$/);
    if (!match) return 24 * 60 * 60 * 1000;
    const value = parseInt(match[1]);
    switch (match[2]) {
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessSecret = this.configService.getOrThrow<string>('jwt.accessSecret');
    const refreshSecret = this.configService.getOrThrow<string>('jwt.refreshSecret');
    const accessExpiry = this.configService.get<string>('jwt.accessExpiry') ?? '15m';
    const refreshExpiry = this.getRefreshExpiryByRole(role);

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiry as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiry as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await bcrypt.hash(refreshToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedToken },
    });
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const { passwordHash, refreshToken, ...sanitized } = user;
    return sanitized;
  }

  private recordFailedAttempt(email: string) {
    const existing = this.loginAttempts.get(email);
    this.loginAttempts.set(email, {
      count: (existing?.count || 0) + 1,
      lastAttempt: Date.now(),
    });
  }
}
