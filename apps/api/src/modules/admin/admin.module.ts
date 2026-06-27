import { Module, forwardRef } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EventsModule } from '../events/events.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [EventsModule, forwardRef(() => OrdersModule)],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
