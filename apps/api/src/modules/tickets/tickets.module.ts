import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { QrService } from './qr.service';
import { InvoiceService } from './invoice.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, QrService, InvoiceService],
  exports: [TicketsService],
})
export class TicketsModule {}
