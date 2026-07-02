import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventCompletionTask } from './event-completion.task';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [SubscriptionsModule, ReferralsModule],
  controllers: [EventsController],
  providers: [EventsService, EventCompletionTask],
  exports: [EventsService],
})
export class EventsModule {}
