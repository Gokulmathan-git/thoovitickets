import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@thoovitickets/database';
import { CreateGstBillDto, UpdateGstBillDto } from './dto/gst-bill.dto';

const Decimal = Prisma.Decimal;

@Injectable()
export class GstBillsService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateBillNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const financialYear = new Date().getMonth() >= 3
      ? `${currentYear}-${String(nextYear).slice(2)}`
      : `${currentYear - 1}-${String(currentYear).slice(2)}`;

    const prefix = `TT/GST/${financialYear}/`;

    const lastBill = await this.prisma.gstBill.findFirst({
      where: { billNumber: { startsWith: prefix } },
      orderBy: { billNumber: 'desc' },
    });

    let nextSeq = 1;
    if (lastBill) {
      const lastSeq = parseInt(lastBill.billNumber.replace(prefix, ''), 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  async create(dto: CreateGstBillDto) {
    const billNumber = await this.generateBillNumber();

    const taxableAmount = new Decimal(dto.quantity).mul(new Decimal(dto.rate));
    const cgstAmount = taxableAmount.mul(new Decimal(dto.cgstPercent)).div(100);
    const sgstAmount = taxableAmount.mul(new Decimal(dto.sgstPercent)).div(100);
    const igstAmount = taxableAmount.mul(new Decimal(dto.igstPercent)).div(100);
    const totalAmount = taxableAmount.add(cgstAmount).add(sgstAmount).add(igstAmount);

    const bill = await this.prisma.gstBill.create({
      data: {
        billNumber,
        billDate: new Date(dto.billDate),
        companyName: dto.companyName || 'ThooviTickets',
        companyGst: dto.companyGst || null,
        companyPan: dto.companyPan || null,
        companyAddress: dto.companyAddress || null,
        organiserId: dto.organiserId,
        settlementId: dto.settlementId || null,
        orgName: dto.orgName,
        orgGstNumber: dto.orgGstNumber || null,
        orgAddress: dto.orgAddress || null,
        description: dto.description,
        hsnCode: dto.hsnCode || null,
        quantity: dto.quantity,
        rate: dto.rate,
        taxableAmount,
        cgstPercent: dto.cgstPercent,
        cgstAmount,
        sgstPercent: dto.sgstPercent,
        sgstAmount,
        igstPercent: dto.igstPercent,
        igstAmount,
        totalAmount,
        amountInWords: this.numberToWords(Number(totalAmount)),
        notes: dto.notes || null,
      },
      include: {
        organiser: { select: { id: true, firstName: true, lastName: true, orgName: true, email: true } },
        settlement: { select: { id: true, status: true, netPayout: true, transactionRef: true } },
      },
    });

    return bill;
  }

  async update(id: string, dto: UpdateGstBillDto) {
    const existing = await this.prisma.gstBill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('GST Bill not found');

    const quantity = dto.quantity ?? existing.quantity;
    const rate = dto.rate !== undefined ? new Decimal(dto.rate) : existing.rate;
    const cgstPercent = dto.cgstPercent !== undefined ? new Decimal(dto.cgstPercent) : existing.cgstPercent;
    const sgstPercent = dto.sgstPercent !== undefined ? new Decimal(dto.sgstPercent) : existing.sgstPercent;
    const igstPercent = dto.igstPercent !== undefined ? new Decimal(dto.igstPercent) : existing.igstPercent;

    const taxableAmount = new Decimal(quantity).mul(rate);
    const cgstAmount = taxableAmount.mul(cgstPercent).div(100);
    const sgstAmount = taxableAmount.mul(sgstPercent).div(100);
    const igstAmount = taxableAmount.mul(igstPercent).div(100);
    const totalAmount = taxableAmount.add(cgstAmount).add(sgstAmount).add(igstAmount);

    const bill = await this.prisma.gstBill.update({
      where: { id },
      data: {
        ...(dto.billDate && { billDate: new Date(dto.billDate) }),
        ...(dto.companyName !== undefined && { companyName: dto.companyName || 'ThooviTickets' }),
        ...(dto.companyGst !== undefined && { companyGst: dto.companyGst || null }),
        ...(dto.companyPan !== undefined && { companyPan: dto.companyPan || null }),
        ...(dto.companyAddress !== undefined && { companyAddress: dto.companyAddress || null }),
        ...(dto.orgName && { orgName: dto.orgName }),
        ...(dto.orgGstNumber !== undefined && { orgGstNumber: dto.orgGstNumber || null }),
        ...(dto.orgAddress !== undefined && { orgAddress: dto.orgAddress || null }),
        ...(dto.description && { description: dto.description }),
        ...(dto.hsnCode !== undefined && { hsnCode: dto.hsnCode || null }),
        quantity,
        rate,
        taxableAmount,
        cgstPercent,
        cgstAmount,
        sgstPercent,
        sgstAmount,
        igstPercent,
        igstAmount,
        totalAmount,
        amountInWords: this.numberToWords(Number(totalAmount)),
        ...(dto.notes !== undefined && { notes: dto.notes || null }),
      },
      include: {
        organiser: { select: { id: true, firstName: true, lastName: true, orgName: true, email: true } },
        settlement: { select: { id: true, status: true, netPayout: true, transactionRef: true } },
      },
    });

    return bill;
  }

  async delete(id: string) {
    const existing = await this.prisma.gstBill.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('GST Bill not found');

    await this.prisma.gstBill.delete({ where: { id } });
    return { deleted: true };
  }

  async findAll() {
    return this.prisma.gstBill.findMany({
      include: {
        organiser: { select: { id: true, firstName: true, lastName: true, orgName: true, email: true } },
        settlement: { select: { id: true, status: true, netPayout: true, transactionRef: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const bill = await this.prisma.gstBill.findUnique({
      where: { id },
      include: {
        organiser: { select: { id: true, firstName: true, lastName: true, orgName: true, email: true, gstNumber: true } },
        settlement: { select: { id: true, status: true, netPayout: true, transactionRef: true, event: { select: { title: true } } } },
      },
    });
    if (!bill) throw new NotFoundException('GST Bill not found');
    return bill;
  }

  async getOrganisers() {
    return this.prisma.user.findMany({
      where: { role: 'ORGANISER' },
      select: { id: true, firstName: true, lastName: true, orgName: true, email: true, gstNumber: true },
      orderBy: { orgName: 'asc' },
    });
  }

  async getOrganiserSettlements(organiserId: string) {
    return this.prisma.settlement.findMany({
      where: { organiserId, status: 'COMPLETED' },
      select: {
        id: true,
        netPayout: true,
        transactionRef: true,
        processedAt: true,
        event: { select: { title: true } },
      },
      orderBy: { processedAt: 'desc' },
    });
  }

  private numberToWords(num: number): string {
    if (num === 0) return 'Zero';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const intPart = Math.floor(num);
    const decPart = Math.round((num - intPart) * 100);

    const convert = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    };

    let result = 'Rupees ' + convert(intPart);
    if (decPart > 0) {
      result += ' and ' + convert(decPart) + ' Paise';
    }
    result += ' Only';
    return result;
  }
}
