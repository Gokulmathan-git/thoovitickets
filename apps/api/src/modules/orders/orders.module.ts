import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersExpirationTask } from './orders-expiration.task';
import { TicketsModule } from '../tickets/tickets.module';
import { DiscountsModule } from '../discounts/discounts.module';

@Module({
  imports: [TicketsModule, DiscountsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersExpirationTask],
  exports: [OrdersService],
})
export class OrdersModule {}
