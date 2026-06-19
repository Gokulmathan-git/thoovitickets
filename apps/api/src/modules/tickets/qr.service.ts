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

  generateTicketCode(orgName: string, eventDate: Date): string {
    const org3 = orgName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'TTX';
    const dd = String(eventDate.getDate()).padStart(2, '0');
    const mm = String(eventDate.getMonth() + 1).padStart(2, '0');
    const yy = String(eventDate.getFullYear()).slice(-2);
    const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `TT-${org3}${dd}${mm}${yy}-${rand}`;
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
