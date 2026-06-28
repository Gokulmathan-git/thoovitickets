import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EventCompletionTask {
  private readonly logger = new Logger(EventCompletionTask.name);

  constructor(private readonly prisma: PrismaService) {}

  @Interval(300_000)
  async completeEndedEvents() {
    try {
      const result = await this.prisma.event.updateMany({
        where: {
          status: 'PUBLISHED',
          endDate: { lt: new Date() },
        },
        data: { status: 'COMPLETED' },
      });

      if (result.count > 0) {
        this.logger.log(`Marked ${result.count} event(s) as COMPLETED`);
      }
    } catch (error: any) {
      if (error?.code === 'P1017') {
        this.logger.warn('Database connection lost, will retry next cycle');
      } else {
        this.logger.error('Event completion task failed', error);
      }
    }
  }
}
