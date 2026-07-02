import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ReferralsService } from '../referrals/referrals.service';

@Injectable()
export class EventCompletionTask {
  private readonly logger = new Logger(EventCompletionTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly referralsService: ReferralsService,
  ) {}

  @Interval(300_000)
  async completeEndedEvents() {
    try {
      const eventsToComplete = await this.prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          endDate: { lt: new Date() },
        },
        select: { id: true },
      });

      if (eventsToComplete.length === 0) return;

      await this.prisma.event.updateMany({
        where: { id: { in: eventsToComplete.map(e => e.id) } },
        data: { status: 'COMPLETED' },
      });

      this.logger.log(`Marked ${eventsToComplete.length} event(s) as COMPLETED`);

      for (const event of eventsToComplete) {
        try {
          await this.referralsService.checkAndQualifyReferral(event.id);
        } catch (err) {
          this.logger.error(`Referral check failed for event ${event.id}`, err);
        }
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
