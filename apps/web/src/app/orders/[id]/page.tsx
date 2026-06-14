'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, XCircle, Calendar, MapPin } from 'lucide-react';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  expiresAt: string | null;
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    ticketType: { name: string; price: number; currency: string; description: string | null };
    event: { title: string; slug: string; venue: string; address: string | null; city: string; state: string | null; startDate: string; endDate: string };
  }[];
  payment: { status: string; provider: string } | null;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string; bg: string }> = {
  CONFIRMED: { icon: CheckCircle, color: 'text-green-600', label: 'Confirmed', bg: 'bg-green-50' },
  PENDING: { icon: Clock, color: 'text-amber-600', label: 'Pending Payment', bg: 'bg-amber-50' },
  CANCELLED: { icon: XCircle, color: 'text-red-600', label: 'Cancelled', bg: 'bg-red-50' },
  EXPIRED: { icon: XCircle, color: 'text-gray-600', label: 'Expired', bg: 'bg-gray-50' },
  REFUNDED: { icon: XCircle, color: 'text-blue-600', label: 'Refunded', bg: 'bg-blue-50' },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    apiClient
      .get(`/orders/${params.id}`)
      .then((res) => setOrder(res.data.data))
      .catch(() => router.push('/orders'))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleCancel = async () => {
    if (!order || !confirm('Are you sure you want to cancel this order? Tickets will be released.')) return;
    setCancelling(true);
    try {
      await apiClient.post(`/orders/${order.id}/cancel`);
      setOrder({ ...order, status: 'CANCELLED' });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />)}
        </div>
      </div>
    );
  }

  if (!order) return null;

  const config = statusConfig[order.status] || statusConfig.PENDING;
  const StatusIcon = config.icon;
  const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {/* Status Banner */}
      <div className={cn('mb-6 rounded-xl p-6 text-center', config.bg)}>
        <StatusIcon className={cn('mx-auto h-12 w-12', config.color)} />
        <h1 className={cn('mt-3 text-2xl font-bold', config.color)}>{config.label}</h1>
        <p className="mt-1 text-sm text-gray-600">Order #{order.orderNumber}</p>
        <p className="text-xs text-gray-400">
          Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
        </p>
      </div>

      <div className="space-y-4">
        {/* Event & Ticket Details */}
        {order.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <Link href={`/events/${item.event.slug}`} className="font-semibold text-gray-900 hover:text-blue-600 text-lg">
                {item.event.title}
              </Link>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(item.event.startDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {item.event.venue}, {item.event.city}
                </div>
              </div>
              <div className="mt-3 rounded-md bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.ticketType.name}</p>
                    {item.ticketType.description && (
                      <p className="text-xs text-gray-500">{item.ticketType.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {item.quantity} x ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                    </p>
                    <p className="font-bold text-gray-900">
                      ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-gray-600">
                  <span>{item.ticketType.name} x{item.quantity}</span>
                  <span>₹{Number(item.totalPrice).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-base">
                <span>Total Paid</span>
                <span>₹{Number(order.totalAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between">
          <Link href="/orders">
            <Button variant="outline">View All Orders</Button>
          </Link>
          {canCancel && (
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
