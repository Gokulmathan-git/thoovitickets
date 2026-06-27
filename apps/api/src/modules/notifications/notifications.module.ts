import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EventReminderTask } from './event-reminder.task';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EventReminderTask],
  exports: [NotificationsService],
})
export class NotificationsModule {}
