import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly gmailTransport: nodemailer.Transporter | null;
  private readonly fromEmail: string;
  private readonly gmailUser: string | undefined;
  private readonly frontendUrl: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.getOrThrow<string>('resend.apiKey'));
    this.fromEmail = this.configService.get<string>('resend.fromEmail') || 'onboarding@resend.dev';
    this.frontendUrl = this.configService.get<string>('frontendUrl') || 'http://localhost:3000';

    this.gmailUser = this.configService.get<string>('gmail.user');
    const gmailAppPassword = this.configService.get<string>('gmail.appPassword');

    if (this.gmailUser && gmailAppPassword) {
      this.gmailTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: this.gmailUser, pass: gmailAppPassword },
      });
      this.logger.log('Gmail SMTP fallback configured');
    } else {
      this.gmailTransport = null;
      this.logger.warn('Gmail SMTP fallback not configured — set GMAIL_USER and GMAIL_APP_PASSWORD');
    }
  }

  async sendVerificationEmail(to: string, firstName: string, token: string) {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    const subject = 'Verify your email - ThooviTickets';
    const html = this.verificationTemplate(firstName, verifyUrl);

    await this.sendEmail(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, firstName: string, token: string) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    const subject = 'Reset your password - ThooviTickets';
    const html = this.passwordResetTemplate(firstName, resetUrl);

    await this.sendEmail(to, subject, html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    try {
      await this.sendViaResend(to, subject, html);
    } catch (resendError) {
      this.logger.warn(`Resend failed, attempting Gmail SMTP fallback: ${resendError}`);

      if (!this.gmailTransport) {
        this.logger.error('Gmail fallback not configured — email not sent');
        throw resendError;
      }

      try {
        await this.sendViaGmail(to, subject, html);
      } catch (gmailError) {
        this.logger.error(`Gmail fallback also failed: ${gmailError}`);
        throw gmailError;
      }
    }
  }

  private async sendViaResend(to: string, subject: string, html: string) {
    await this.resend.emails.send({
      from: `ThooviTickets <${this.fromEmail}>`,
      to,
      subject,
      html,
    });
    this.logger.log(`Email sent via Resend to ${to}`);
  }

  private async sendViaGmail(to: string, subject: string, html: string) {
    await this.gmailTransport!.sendMail({
      from: `ThooviTickets <${this.gmailUser}>`,
      to,
      subject,
      html,
    });
    this.logger.log(`Email sent via Gmail SMTP to ${to}`);
  }

  private verificationTemplate(firstName: string, verifyUrl: string) {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #f97316; color: white; font-size: 24px; font-weight: bold; width: 48px; height: 48px; line-height: 48px; border-radius: 12px;">T</div>
        </div>
        <h1 style="color: #111827; font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 8px;">
          Verify your email
        </h1>
        <p style="color: #6b7280; font-size: 15px; text-align: center; margin-bottom: 32px;">
          Hi ${firstName}, thanks for signing up! Please verify your email to get started.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${verifyUrl}" style="display: inline-block; background: #f97316; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `;
  }

  private passwordResetTemplate(firstName: string, resetUrl: string) {
    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #f97316; color: white; font-size: 24px; font-weight: bold; width: 48px; height: 48px; line-height: 48px; border-radius: 12px;">T</div>
        </div>
        <h1 style="color: #111827; font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 8px;">
          Reset your password
        </h1>
        <p style="color: #6b7280; font-size: 15px; text-align: center; margin-bottom: 32px;">
          Hi ${firstName}, we received a request to reset your password.
        </p>
        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${resetUrl}" style="display: inline-block; background: #f97316; color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">
          This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `;
  }
}
