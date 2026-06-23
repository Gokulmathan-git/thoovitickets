import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import PDFDocument = require('pdfkit');

interface InvoiceData {
  orderNumber: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: {
    eventTitle: string;
    ticketType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  convenienceFee: number;
  platformFee: number;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
  companyName?: string;
  gstNumber?: string;
  panNumber?: string;
}

interface TicketPdfData {
  ticketCode: string;
  qrDataUrl: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  attendeeName: string;
  attendeeEmail: string;
  ticketType: string;
  seatInfo?: string;
}

@Injectable()
export class InvoiceService {
  private tableBottomY = 0;

  async generateTicketPdf(data: TicketPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: [300, 500], margin: 20 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // --- Header: ThooviTickets logo ---
      try {
        const logoPath = path.join(__dirname, '..', '..', 'assets', 'Main_logo.svg');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 80, 12, { width: 140 });
        } else {
          doc.fillColor('#f97316').fontSize(18).font('Helvetica-Bold').text('ThooviTickets', 20, 20, { align: 'center', width: 260 });
        }
      } catch {
        doc.fillColor('#f97316').fontSize(18).font('Helvetica-Bold').text('ThooviTickets', 20, 20, { align: 'center', width: 260 });
      }

      doc
        .fillColor('#6b7280')
        .fontSize(8)
        .font('Helvetica')
        .text('Your Event, Your Experience', 20, 42, { align: 'center', width: 260 });

      // Divider
      doc.moveTo(20, 56).lineTo(280, 56).strokeColor('#e5e7eb').stroke();

      // --- QR Code (centered) ---
      const qrSize = 140;
      const qrX = (300 - qrSize) / 2;
      const qrY = 65;

      try {
        const base64Data = data.qrDataUrl.replace(/^data:image\/\w+;base64,/, '');
        const qrBuffer = Buffer.from(base64Data, 'base64');
        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      } catch {
        // Fallback: draw a placeholder rectangle if QR fails
        doc
          .rect(qrX, qrY, qrSize, qrSize)
          .strokeColor('#d1d5db')
          .stroke();
        doc
          .fillColor('#9ca3af')
          .fontSize(10)
          .text('QR Code', qrX, qrY + 60, { width: qrSize, align: 'center' });
      }

      // --- Ticket Code below QR ---
      const codeY = qrY + qrSize + 10;
      doc
        .fillColor('#111827')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(data.ticketCode, 20, codeY, { align: 'center', width: 260 });

      // Divider
      const divY = codeY + 20;
      doc.moveTo(30, divY).lineTo(270, divY).strokeColor('#e5e7eb').stroke();

      // --- Event Details ---
      let detailY = divY + 10;

      doc
        .fillColor('#f97316')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(data.eventTitle, 20, detailY, { align: 'center', width: 260 });

      detailY += 18;
      doc
        .fillColor('#374151')
        .fontSize(9)
        .font('Helvetica');

      doc.text(`Date: ${data.eventDate}`, 30, detailY, { width: 240 });
      detailY += 14;
      doc.text(`Time: ${data.eventTime}`, 30, detailY, { width: 240 });
      detailY += 14;
      doc.text(`Venue: ${data.venue}`, 30, detailY, { width: 240 });
      detailY += 14;
      doc.text(`Ticket: ${data.ticketType}`, 30, detailY, { width: 240 });

      if (data.seatInfo) {
        detailY += 14;
        doc.text(`Seat: ${data.seatInfo}`, 30, detailY, { width: 240 });
      }

      // Divider
      detailY += 20;
      doc.moveTo(30, detailY).lineTo(270, detailY).strokeColor('#e5e7eb').stroke();

      // --- Attendee Info ---
      detailY += 10;
      doc
        .fillColor('#111827')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Attendee', 30, detailY, { width: 240 });

      detailY += 14;
      doc
        .fillColor('#374151')
        .fontSize(9)
        .font('Helvetica')
        .text(data.attendeeName, 30, detailY, { width: 240 });

      detailY += 12;
      doc.text(data.attendeeEmail, 30, detailY, { width: 240 });

      // --- Footer ---
      doc
        .fillColor('#9ca3af')
        .fontSize(7)
        .font('Helvetica')
        .text('Show this QR at the entrance', 20, 470, { align: 'center', width: 260 });

      doc
        .fillColor('#d1d5db')
        .fontSize(6)
        .text('Powered by ThooviTickets', 20, 484, { align: 'center', width: 260 });

      doc.end();
    });
  }

  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.buildHeader(doc, data);
      this.buildCompanyInfo(doc, data);
      this.buildCustomerInfo(doc, data);
      this.buildItemsTable(doc, data);
      this.buildTotals(doc, data);
      this.buildFooter(doc);

      doc.end();
    });
  }

  private buildHeader(doc: PDFKit.PDFDocument, data: InvoiceData) {
    try {
      const logoPath = path.join(__dirname, '..', '..', 'assets', 'Main_logo.svg');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 45, { width: 180 });
      } else {
        doc.fillColor('#f97316').fontSize(24).font('Helvetica-Bold').text('ThooviTickets', 50, 50);
        doc.fillColor('#6b7280').fontSize(10).font('Helvetica').text('Event Ticketing Platform', 50, 78);
      }
    } catch {
      doc.fillColor('#f97316').fontSize(24).font('Helvetica-Bold').text('ThooviTickets', 50, 50);
      doc.fillColor('#6b7280').fontSize(10).font('Helvetica').text('Event Ticketing Platform', 50, 78);
    }

    doc
      .fillColor('#111827')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, 50, { align: 'right' });

    doc
      .fillColor('#6b7280')
      .fontSize(10)
      .font('Helvetica')
      .text(`Invoice: ${data.orderNumber}`, 400, 75, { align: 'right' })
      .text(`Date: ${data.orderDate}`, 400, 90, { align: 'right' })
      .text(`Status: ${data.paymentStatus}`, 400, 105, { align: 'right' });

    doc.moveTo(50, 125).lineTo(545, 125).strokeColor('#e5e7eb').stroke();
  }

  private buildCompanyInfo(doc: PDFKit.PDFDocument, data: InvoiceData) {
    let y = 135;

    doc
      .fillColor('#111827')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('From:', 50, y);

    y += 18;
    doc
      .fillColor('#374151')
      .fontSize(10)
      .font('Helvetica')
      .text(data.companyName || 'ThooviTickets', 50, y);

    y += 14;
    if (data.gstNumber) {
      doc.text(`GST: ${data.gstNumber}`, 50, y);
      y += 14;
    }
    if (data.panNumber) {
      doc.text(`PAN: ${data.panNumber}`, 50, y);
      y += 14;
    }

    this.companyInfoBottomY = y;
  }

  private companyInfoBottomY = 0;

  private buildCustomerInfo(doc: PDFKit.PDFDocument, data: InvoiceData) {
    const startY = 135;

    doc
      .fillColor('#111827')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Bill To:', 350, startY);

    doc
      .fillColor('#374151')
      .fontSize(10)
      .font('Helvetica')
      .text(data.customerName, 350, startY + 18)
      .text(data.customerEmail, 350, startY + 32);

    if (data.customerPhone) {
      doc.text(data.customerPhone, 350, startY + 46);
    }
  }

  private buildItemsTable(doc: PDFKit.PDFDocument, data: InvoiceData) {
    const tableTop = Math.max(this.companyInfoBottomY + 20, 210);

    // Table header background
    doc
      .fillColor('#f3f4f6')
      .rect(50, tableTop, 495, 22)
      .fill();

    // Table header text
    doc
      .fillColor('#374151')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('#', 55, tableTop + 6, { width: 25 })
      .text('Event / Ticket', 80, tableTop + 6, { width: 180 })
      .text('Qty', 270, tableTop + 6, { width: 50, align: 'center' })
      .text('Unit Price', 330, tableTop + 6, { width: 80, align: 'right' })
      .text('Total', 430, tableTop + 6, { width: 110, align: 'right' });

    let y = tableTop + 30;
    doc.font('Helvetica').fontSize(9).fillColor('#111827');

    data.items.forEach((item, index) => {
      doc
        .fillColor('#6b7280')
        .text(String(index + 1), 55, y + 4, { width: 25 })
        .fillColor('#111827')
        .text(item.eventTitle, 80, y, { width: 180 })
        .fillColor('#6b7280')
        .text(item.ticketType, 80, y + 13, { width: 180 })
        .fillColor('#111827')
        .text(String(item.quantity), 270, y + 4, { width: 50, align: 'center' })
        .text(`${data.currency} ${item.unitPrice.toFixed(2)}`, 330, y + 4, { width: 80, align: 'right' })
        .text(`${data.currency} ${item.totalPrice.toFixed(2)}`, 430, y + 4, { width: 110, align: 'right' });

      y += 35;
      doc.moveTo(50, y - 5).lineTo(545, y - 5).strokeColor('#f3f4f6').stroke();
    });

    this.tableBottomY = y;
  }

  private buildTotals(doc: PDFKit.PDFDocument, data: InvoiceData) {
    let y = this.tableBottomY + 10;

    doc.moveTo(350, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
    y += 10;

    // Subtotal
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Subtotal', 350, y, { width: 90 })
      .fillColor('#111827')
      .text(`${data.currency} ${data.subtotal.toFixed(2)}`, 440, y, { width: 100, align: 'right' });

    // Convenience Fee
    y += 18;
    doc
      .fillColor('#6b7280')
      .text('Convenience Fee', 350, y, { width: 90 })
      .fillColor('#111827')
      .text(`${data.currency} ${data.convenienceFee.toFixed(2)}`, 440, y, { width: 100, align: 'right' });

    // Platform Fee
    y += 18;
    doc
      .fillColor('#6b7280')
      .text('Platform Fee', 350, y, { width: 90 })
      .fillColor('#111827')
      .text(`${data.currency} ${data.platformFee.toFixed(2)}`, 440, y, { width: 100, align: 'right' });

    // Total line
    y += 25;
    doc.moveTo(350, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
    y += 10;

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#111827')
      .text('Total', 350, y, { width: 90 })
      .text(`${data.currency} ${data.totalAmount.toFixed(2)}`, 440, y, { width: 100, align: 'right' });
  }

  private buildFooter(doc: PDFKit.PDFDocument) {
    const bottomY = doc.page.height - 80;

    doc
      .fillColor('#111827')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Thank you for your purchase!', 50, bottomY, { align: 'center', width: 495 });

    doc
      .fillColor('#9ca3af')
      .fontSize(8)
      .font('Helvetica')
      .text(
        'This is a computer-generated invoice and does not require a signature.',
        50,
        bottomY + 18,
        { align: 'center', width: 495 },
      )
      .text(
        'For support, contact support@thoovitickets.com',
        50,
        bottomY + 32,
        { align: 'center', width: 495 },
      );
  }
}
