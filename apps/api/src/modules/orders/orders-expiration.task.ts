import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@thoovitickets/database';

@Injectable()
export class OrdersExpirationTask {
  private readonly logger = new Logger(OrdersExpirationTask.name);

  constructor(private readonly prisma: PrismaService) {}

  @Interval(120_000)
  async expireOrders() {
    try {
      const expiredOrders = await this.prisma.order.findMany({
        where: {
          status: OrderStatus.PENDING,
          expiresAt: { lte: new Date() },
        },
        include: { items: true },
      });

      if (expiredOrders.length === 0) return;

      this.logger.log(`Expiring ${expiredOrders.length} pending order(s)`);

      for (const order of expiredOrders) {
        try {
          await this.prisma.$transaction(async (tx) => {
            await tx.order.update({
              where: { id: order.id },
              data: { status: OrderStatus.EXPIRED },
            });

            for (const item of order.items) {
              await tx.ticketType.update({
                where: { id: item.ticketTypeId },
                data: { soldQty: { decrement: item.quantity } },
              });
            }
          });
        } catch (error) {
          this.logger.error(`Failed to expire order ${order.id}`, error);
        }
      }
    } catch (error: any) {
      if (error?.code === 'P1017') {
        this.logger.warn('Database connection lost, will retry next cycle');
      } else {
        this.logger.error('Order expiration task failed', error);
      }
    }
  }
}
