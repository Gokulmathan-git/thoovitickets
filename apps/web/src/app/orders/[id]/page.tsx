'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, XCircle, Calendar, MapPin, Download, Mail, QrCode } from 'lucide-react';

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

interface TicketInfo {
  id: string;
  ticketCode: string;
  status: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  qrDataUrl: string | null;
  checkedInAt: string | null;
  orderItem: {
    ticketType: { name: string };
    event: { title: string; venue: string; startDate: string };
  };
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string; bg: string }> = {
  CONFIRMED: { icon: CheckCircle, color: 'text-green-600', label: 'Confirmed', bg: 'bg-green-50 dark:bg-green-900/20' },
  PENDING: { icon: Clock, color: 'text-amber-600', label: 'Pending Payment', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  CANCELLED: { icon: XCircle, color: 'text-red-600 dark:text-red-400', label: 'Cancelled', bg: 'bg-red-50 dark:bg-red-900/20' },
  EXPIRED: { icon: XCircle, color: 'text-gray-600 dark:text-gray-300', label: 'Expired', bg: 'bg-gray-50 dark:bg-gray-900' },
  REFUNDED: { icon: XCircle, color: 'text-blue-600', label: 'Refunded', bg: 'bg-blue-50 dark:bg-blue-900/20' },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const orderRes = await apiClient.get(`/orders/${params.id}`);
        const orderData = orderRes.data.data;
        setOrder(orderData);

        if (orderData.status === 'CONFIRMED') {
          try {
            const ticketsRes = await apiClient.get(`/tickets/order/${params.id}`);
            setTickets(ticketsRes.data.data || []);
          } catch { /* tickets may not be generated yet */ }
        }
      } catch {
        router.push('/orders');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [params.id, router]);

  const handleCancel = async () => {
    if (!order || !confirm('Are you sure you want to cancel this order? Tickets will be released.')) return;
    setCancelling(true);
    try {
      await apiClient.post(`/orders/${order.id}/cancel`);
      setOrder({ ...order, status: 'CANCELLED' });
      setTickets([]);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setDownloading(true);
    try {
      const res = await apiClient.get(`/tickets/order/${order.id}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!order) return;
    setSendingEmail(true);
    try {
      await apiClient.post(`/tickets/order/${order.id}/send-email`);
      setEmailSent(true);
    } catch {
      alert('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}
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
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Order #{order.orderNumber}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}
        </p>
      </div>

      <div className="space-y-4">
        {/* Tickets Section */}
        {tickets.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <QrCode className="h-5 w-5 text-orange-500" />
                  Your Tickets ({tickets.length})
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadInvoice}
                    disabled={downloading}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    {downloading ? 'Downloading...' : 'Invoice'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendEmail}
                    disabled={sendingEmail || emailSent}
                  >
                    <Mail className="mr-1 h-4 w-4" />
                    {emailSent ? 'Sent!' : sendingEmail ? 'Sending...' : 'Email'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={cn(
                      'rounded-xl border p-4 transition-all',
                      ticket.status === 'USED' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' :
                      ticket.status === 'CANCELLED' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 opacity-60' :
                      'border-gray-200 dark:border-gray-700 hover:border-orange-200 hover:shadow-md',
                    )}
                  >
                    {ticket.qrDataUrl && (
                      <div className="mb-3 flex justify-center">
                        <img
                          src={ticket.qrDataUrl}
                          alt={`QR Code - ${ticket.ticketCode}`}
                          className="h-32 w-32"
                        />
                      </div>
                    )}
                    <div className="text-center">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{ticket.attendeeName}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{ticket.orderItem.ticketType.name}</p>
                      <p className="mt-1 font-mono text-xs text-orange-600">{ticket.ticketCode}</p>
                      {ticket.status === 'USED' && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                          <CheckCircle className="h-3 w-3" /> Checked In
                        </span>
                      )}
                      {ticket.status === 'CANCELLED' && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                          <XCircle className="h-3 w-3" /> Cancelled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event & Ticket Details */}
        {order.items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <Link href={`/events/${item.event.slug}`} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 text-base sm:text-lg wrap-break-word">
                {item.event.title}
              </Link>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(item.event.startDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {item.event.venue}, {item.event.city}
                </div>
              </div>
              <div className="mt-3 rounded-md bg-gray-50 dark:bg-gray-900 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.ticketType.name}</p>
                    {item.ticketType.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.ticketType.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.quantity} x ₹{Number(item.unitPrice).toLocaleString('en-IN')}
                    </p>
                    <p className="font-bold text-gray-900 dark:text-gray-100">
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
                <div key={item.id} className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>{item.ticketType.name} x{item.quantity}</span>
                  <span>₹{Number(item.totalPrice).toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-gray-900 dark:text-gray-100 text-base">
                <span>Total Paid</span>
                <span>₹{Number(order.totalAmount).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <Link href="/orders">
            <Button variant="outline" className="w-full sm:w-auto">View All Orders</Button>
          </Link>
          {canCancel && (
            <Button variant="destructive" className="w-full sm:w-auto" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
