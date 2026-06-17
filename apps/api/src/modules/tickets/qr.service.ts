import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl = this.configService.get<string>('frontendUrl') || 'http://localhost:3000';
  }

  generateTicketCode(): string {
    const bytes = crypto.randomBytes(6);
    const hex = bytes.toString('hex').toUpperCase();
    return `TT-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  }

  async generateQrDataUrl(ticketCode: string): Promise<{ qrData: string; qrDataUrl: string }> {
    const qrData = `${this.frontendUrl}/verify/${ticketCode}`;
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    return { qrData, qrDataUrl };
  }
}
