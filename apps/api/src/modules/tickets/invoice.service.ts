import { Injectable } from '@nestjs/common';
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
  platformFee: number;
  totalAmount: number;
  currency: string;
  paymentStatus: string;
}

@Injectable()
export class InvoiceService {
  async generateInvoice(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.buildHeader(doc, data);
      this.buildCustomerInfo(doc, data);
      this.buildItemsTable(doc, data);
      this.buildTotals(doc, data);
      this.buildFooter(doc);

      doc.end();
    });
  }

  private buildHeader(doc: PDFKit.PDFDocument, data: InvoiceData) {
    doc
      .fillColor('#f97316')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('ThooviTickets', 50, 50)
      .fillColor('#6b7280')
      .fontSize(10)
      .font('Helvetica')
      .text('Event Ticketing Platform', 50, 78);

    doc
      .fillColor('#111827')
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, 50, { align: 'right' });

    doc
      .fillColor('#6b7280')
      .fontSize(10)
      .font('Helvetica')
      .text(`Order: ${data.orderNumber}`, 400, 75, { align: 'right' })
      .text(`Date: ${data.orderDate}`, 400, 90, { align: 'right' })
      .text(`Status: ${data.paymentStatus}`, 400, 105, { align: 'right' });

    doc.moveTo(50, 125).lineTo(545, 125).strokeColor('#e5e7eb').stroke();
  }

  private buildCustomerInfo(doc: PDFKit.PDFDocument, data: InvoiceData) {
    doc
      .fillColor('#111827')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Bill To:', 50, 140);

    doc
      .fillColor('#374151')
      .fontSize(10)
      .font('Helvetica')
      .text(data.customerName, 50, 158)
      .text(data.customerEmail, 50, 173);

    if (data.customerPhone) {
      doc.text(data.customerPhone, 50, 188);
    }
  }

  private buildItemsTable(doc: PDFKit.PDFDocument, data: InvoiceData) {
    const tableTop = 220;

    doc
      .fillColor('#f3f4f6')
      .rect(50, tableTop, 495, 22)
      .fill();

    doc
      .fillColor('#374151')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('Event / Ticket', 55, tableTop + 6, { width: 200 })
      .text('Qty', 280, tableTop + 6, { width: 50, align: 'center' })
      .text('Unit Price', 340, tableTop + 6, { width: 80, align: 'right' })
      .text('Total', 440, tableTop + 6, { width: 100, align: 'right' });

    let y = tableTop + 30;
    doc.font('Helvetica').fontSize(9).fillColor('#111827');

    for (const item of data.items) {
      doc
        .text(item.eventTitle, 55, y, { width: 200 })
        .fillColor('#6b7280')
        .text(item.ticketType, 55, y + 13, { width: 200 })
        .fillColor('#111827')
        .text(String(item.quantity), 280, y + 4, { width: 50, align: 'center' })
        .text(`${data.currency} ${item.unitPrice.toFixed(2)}`, 340, y + 4, { width: 80, align: 'right' })
        .text(`${data.currency} ${item.totalPrice.toFixed(2)}`, 440, y + 4, { width: 100, align: 'right' });

      y += 35;
      doc.moveTo(50, y - 5).lineTo(545, y - 5).strokeColor('#f3f4f6').stroke();
    }

    this.tableBottomY = y;
  }

  private tableBottomY = 0;

  private buildTotals(doc: PDFKit.PDFDocument, data: InvoiceData) {
    let y = this.tableBottomY + 10;

    doc.moveTo(350, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
    y += 10;

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#6b7280')
      .text('Subtotal', 350, y, { width: 90 })
      .fillColor('#111827')
      .text(`${data.currency} ${data.subtotal.toFixed(2)}`, 440, y, { width: 100, align: 'right' });

    y += 18;
    doc
      .fillColor('#6b7280')
      .text('Platform Fee', 350, y, { width: 90 })
      .fillColor('#111827')
      .text(`${data.currency} ${data.platformFee.toFixed(2)}`, 440, y, { width: 100, align: 'right' });

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
    doc
      .fillColor('#9ca3af')
      .fontSize(8)
      .font('Helvetica')
      .text(
        'This is a computer-generated invoice. For support, contact support@thoovitickets.com',
        50,
        doc.page.height - 60,
        { align: 'center', width: 495 },
      );
  }
}
