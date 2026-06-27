import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class EventReminderTask {
  private readonly logger = new Logger(EventReminderTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @Interval(600_000)
  async sendEventReminders() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    const upcomingEvents = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { gte: in23h, lte: in24h },
      },
      select: { id: true, title: true, venue: true, city: true, startDate: true },
    });

    if (upcomingEvents.length === 0) return;

    for (const event of upcomingEvents) {
      try {
        const tickets = await this.prisma.ticket.findMany({
          where: {
            status: 'ACTIVE',
            orderItem: { eventId: event.id },
            order: { status: 'CONFIRMED' },
          },
          select: {
            attendeeName: true,
            attendeeEmail: true,
          },
          distinct: ['attendeeEmail'],
        });

        if (tickets.length === 0) continue;

        const alreadySent = await this.prisma.notification.findFirst({
          where: {
            type: 'EVENT_REMINDER',
            linkUrl: { contains: event.id },
            createdAt: { gte: new Date(now.getTime() - 25 * 60 * 60 * 1000) },
          },
        });

        if (alreadySent) continue;

        this.logger.log(`Sending reminders for event "${event.title}" to ${tickets.length} attendees`);

        const startStr = new Date(event.startDate).toLocaleString('en-IN', {
          dateStyle: 'long',
          timeStyle: 'short',
        });

        for (const ticket of tickets) {
          try {
            await this.emailService.sendGenericEmail(
              ticket.attendeeEmail,
              `Reminder: ${event.title} is tomorrow!`,
              `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
                <h2 style="color:#FF541F;">Event Reminder</h2>
                <p>Hi ${ticket.attendeeName},</p>
                <p>Just a friendly reminder that <strong>${event.title}</strong> is happening tomorrow!</p>
                <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin:16px 0;">
                  <p style="margin:4px 0;"><strong>When:</strong> ${startStr}</p>
                  <p style="margin:4px 0;"><strong>Where:</strong> ${event.venue}, ${event.city}</p>
                </div>
                <p>Don't forget to bring your tickets. See you there!</p>
                <p style="color:#999;font-size:12px;">— ThooviTickets</p>
              </div>`,
            );
          } catch (err) {
            this.logger.error(`Failed to send reminder to ${ticket.attendeeEmail}`, err);
          }
        }

        // Create a tracking notification for the organiser
        const orgEvent = await this.prisma.event.findUnique({
          where: { id: event.id },
          select: { organiserId: true },
        });
        if (orgEvent) {
          await this.prisma.notification.create({
            data: {
              userId: orgEvent.organiserId,
              type: 'EVENT_REMINDER',
              title: 'Event starting tomorrow',
              message: `Your event "${event.title}" starts tomorrow. ${tickets.length} attendee(s) have been notified.`,
              linkUrl: `/organiser/events/${event.id}`,
            },
          });
        }
      } catch (err) {
        this.logger.error(`Failed to process reminders for event ${event.id}`, err);
      }
    }
  }
}
