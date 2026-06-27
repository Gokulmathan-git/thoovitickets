import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, TicketStatus, EventStatus } from '@thoovitickets/database';

@Injectable()
export class MobileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid email or password');

    let scannerAccess: any[] = [];

    if (user.role === UserRole.ORGANISER) {
      // Organiser can scan their own events
    } else if (user.role === UserRole.CUSTOMER) {
      scannerAccess = await this.prisma.staffAccount.findMany({
        where: { userId: user.id, isActive: true, accessLevel: { in: ['SCANNER', 'FULL_ACCESS'] } },
        include: { organiser: { select: { id: true, orgName: true, firstName: true, lastName: true } } },
      });
      if (scannerAccess.length === 0) {
        throw new ForbiddenException('You do not have scanner access. Contact your organiser.');
      }
    } else {
      throw new ForbiddenException('Scanner login is only for organisers and scanner staff.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: '12h',
    });

    return {
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      accessToken,
      scannerAccess: scannerAccess.map((sa) => ({
        organiserId: sa.organiserId,
        organiserName: sa.organiser.orgName || `${sa.organiser.firstName} ${sa.organiser.lastName}`,
        accessLevel: sa.accessLevel,
      })),
    };
  }

  async getEvents(userId: string, userRole: string) {
    const organiserIds = await this.getAccessibleOrganiserIds(userId, userRole);

    return this.prisma.event.findMany({
      where: {
        organiserId: { in: organiserIds },
        status: { in: [EventStatus.PUBLISHED, 'COMPLETED' as any] },
      },
      select: {
        id: true, title: true, venue: true, city: true, startDate: true, endDate: true, status: true, imageUrl: true,
        ticketTypes: { select: { totalQty: true, soldQty: true } },
      },
      orderBy: { startDate: 'desc' },
      take: 50,
    });
  }

  async getDashboard(userId: string, userRole: string) {
    const organiserIds = await this.getAccessibleOrganiserIds(userId, userRole);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = await this.prisma.event.findMany({
      where: {
        organiserId: { in: organiserIds },
        startDate: { lte: tomorrow },
        endDate: { gte: today },
        status: EventStatus.PUBLISHED,
      },
      select: { id: true, title: true, venue: true, startDate: true },
    });

    const eventIds = todayEvents.map((e) => e.id);

    const [ticketCounts, checkedInCounts] = await Promise.all([
      this.prisma.ticket.count({ where: { orderItem: { eventId: { in: eventIds } }, status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] } } }),
      this.prisma.ticket.count({ where: { orderItem: { eventId: { in: eventIds } }, status: TicketStatus.USED } }),
    ]);

    return {
      today: {
        events: todayEvents,
        totalTickets: ticketCounts,
        checkedIn: checkedInCounts,
        pending: ticketCounts - checkedInCounts,
      },
    };
  }

  async scanTicket(ticketCode: string, userId: string, userRole: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { ticketCode },
      include: {
        orderItem: {
          include: {
            ticketType: { select: { name: true } },
            event: { select: { id: true, title: true, venue: true, startDate: true, endDate: true, status: true, organiserId: true } },
          },
        },
        order: { select: { id: true, orderNumber: true, status: true } },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const organiserIds = await this.getAccessibleOrganiserIds(userId, userRole);
    if (!organiserIds.includes(ticket.orderItem.event.organiserId)) {
      throw new ForbiddenException('You do not have access to scan tickets for this event');
    }

    const allAttendees = await this.prisma.ticket.findMany({
      where: { orderId: ticket.orderId, orderItem: { eventId: ticket.orderItem.event.id } },
      include: { orderItem: { include: { ticketType: { select: { name: true } } } } },
      orderBy: { createdAt: 'asc' },
    });

    const eventEnded = new Date() > new Date(ticket.orderItem.event.endDate);

    return {
      ticket: {
        id: ticket.id, ticketCode: ticket.ticketCode, status: ticket.status,
        attendeeName: ticket.attendeeName, attendeeEmail: ticket.attendeeEmail,
        attendeePhone: ticket.attendeePhone, checkedInAt: ticket.checkedInAt,
      },
      event: {
        id: ticket.orderItem.event.id, title: ticket.orderItem.event.title,
        venue: ticket.orderItem.event.venue, startDate: ticket.orderItem.event.startDate,
        endDate: ticket.orderItem.event.endDate, status: ticket.orderItem.event.status,
      },
      order: { orderNumber: ticket.order.orderNumber },
      allAttendees: allAttendees.map((t) => ({
        id: t.id, ticketCode: t.ticketCode, attendeeName: t.attendeeName,
        attendeeEmail: t.attendeeEmail, attendeePhone: t.attendeePhone,
        ticketType: t.orderItem.ticketType.name, status: t.status, checkedInAt: t.checkedInAt,
      })),
      eventEnded,
      orderStatus: ticket.order.status,
      canCheckIn: !eventEnded && ticket.status === TicketStatus.ACTIVE && ticket.order.status === 'CONFIRMED',
    };
  }

  async checkInMultiple(ticketIds: string[], userId: string, userRole: string) {
    const organiserIds = await this.getAccessibleOrganiserIds(userId, userRole);
    const results: { ticketId: string; status: string; checkedInAt: Date | null; error?: string }[] = [];
    let checkedIn = 0;

    for (const ticketId of ticketIds) {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          orderItem: { include: { event: { select: { organiserId: true, endDate: true } } } },
          order: { select: { status: true } },
        },
      });

      if (!ticket) {
        results.push({ ticketId, status: 'NOT_FOUND', checkedInAt: null, error: 'Ticket not found' });
        continue;
      }

      if (!organiserIds.includes(ticket.orderItem.event.organiserId)) {
        results.push({ ticketId, status: 'FORBIDDEN', checkedInAt: null, error: 'No access' });
        continue;
      }

      if (new Date() > new Date(ticket.orderItem.event.endDate)) {
        results.push({ ticketId, status: 'EVENT_ENDED', checkedInAt: null, error: 'Event has ended' });
        continue;
      }

      if (ticket.order.status !== 'CONFIRMED') {
        results.push({ ticketId, status: 'ORDER_NOT_CONFIRMED', checkedInAt: null, error: 'Order is not confirmed' });
        continue;
      }

      if (ticket.status === TicketStatus.USED) {
        results.push({ ticketId, status: 'ALREADY_USED', checkedInAt: ticket.checkedInAt, error: 'Already checked in' });
        continue;
      }

      if (ticket.status === TicketStatus.CANCELLED) {
        results.push({ ticketId, status: 'CANCELLED', checkedInAt: null, error: 'Ticket cancelled' });
        continue;
      }

      const now = new Date();
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.USED, checkedInAt: now },
      });

      results.push({ ticketId, status: 'CHECKED_IN', checkedInAt: now });
      checkedIn++;
    }

    return { checkedIn, total: ticketIds.length, results };
  }

  async checkInSingle(ticketId: string, userId: string, userRole: string) {
    const result = await this.checkInMultiple([ticketId], userId, userRole);
    return result.results[0];
  }

  private async getAccessibleOrganiserIds(userId: string, userRole: string): Promise<string[]> {
    if (userRole === 'ORGANISER') return [userId];

    const staffAccounts = await this.prisma.staffAccount.findMany({
      where: { userId, isActive: true, accessLevel: { in: ['SCANNER', 'FULL_ACCESS'] } },
      select: { organiserId: true },
    });

    return staffAccounts.map((sa) => sa.organiserId);
  }
}
