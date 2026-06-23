import { Controller, Post, Body, UseGuards, Get, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.register(dto);

    if (result.refreshToken) {
      const role = (result.user as any)?.role || 'CUSTOMER';
      this.setRefreshTokenCookie(response, result.refreshToken, role);
    }

    return {
      message: result.message,
      user: result.user,
      ...(result.accessToken && { accessToken: result.accessToken }),
    };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('token') token: string, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.verifyEmail(token);
    const role = (result.user as any)?.role || 'CUSTOMER';
    this.setRefreshTokenCookie(response, result.refreshToken, role);
    return { user: result.user, accessToken: result.accessToken, message: result.message };
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    const role = (result.user as any)?.role || 'CUSTOMER';
    this.setRefreshTokenCookie(response, result.refreshToken, role);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: { sub: string; refreshToken: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refreshTokens(user.sub, user.refreshToken);
    this.setRefreshTokenCookie(response, result.refreshToken, result.role);

    return { accessToken: result.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(userId);

    const frontendUrl = process.env.FRONTEND_URL || '';
    const isCrossDomain: boolean = frontendUrl.includes('.vercel.app') || frontendUrl.includes('.railway.app') || (frontendUrl.length > 0 && !frontendUrl.includes('localhost'));

    response.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || isCrossDomain,
      sameSite: isCrossDomain ? 'none' : 'strict',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  @Get('me')
  async me(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body('token') token: string, @Body('password') password: string) {
    return this.authService.resetPassword(token, password);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(userId, currentPassword, newPassword);
  }

  private setRefreshTokenCookie(response: Response, refreshToken: string, role?: string) {
    const maxAge = this.authService.getRefreshMaxAgeByRole(role || 'CUSTOMER');
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = process.env.FRONTEND_URL || '';
    const isCrossDomain: boolean = frontendUrl.includes('.vercel.app') || frontendUrl.includes('.railway.app') || (frontendUrl.length > 0 && !frontendUrl.includes('localhost'));

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction || isCrossDomain,
      sameSite: isCrossDomain ? 'none' : 'strict',
      path: '/',
      maxAge,
    });
  }
}
