'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: {
    quantity: number;
    ticketType: { name: string; price: number };
    event: { title: string; slug: string; venue: string; city: string; startDate: string; imageUrl: string | null };
  }[];
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  PENDING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  EXPIRED: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  REFUNDED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/orders')
      .then((res) => setOrders(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">My Orders</h1>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-gray-500 dark:text-gray-400">No orders yet</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Browse events and book your first tickets</p>
            <Link href="/events">
              <Button className="mt-4">Browse Events</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const firstEvent = order.items[0]?.event;
            const totalTickets = order.items.reduce((s, i) => s + i.quantity, 0);

            return (
              <Link key={order.id} href={`/orders/${order.id}`} className="block">
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">#{order.orderNumber}</p>
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[order.status])}>
                            {order.status}
                          </span>
                        </div>
                        {firstEvent && (
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{firstEvent.title}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {totalTickets} ticket{totalTickets !== 1 ? 's' : ''} &middot;{' '}
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </p>
                      </div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">
                        ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
