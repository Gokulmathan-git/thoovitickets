import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventCompletionTask } from './event-completion.task';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [EventsController],
  providers: [EventsService, EventCompletionTask],
  exports: [EventsService],
})
export class EventsModule {}
