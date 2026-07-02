import { Module } from '@nestjs/common';
import { GstBillsController } from './gst-bills.controller';
import { GstBillsService } from './gst-bills.service';

@Module({
  controllers: [GstBillsController],
  providers: [GstBillsService],
  exports: [GstBillsService],
})
export class GstBillsModule {}
