'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ShoppingCart,
  ChevronDown,
  Send,
  Eye,
  X,
  Users,
  Ticket,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
} from 'lucide-react';

// ---- Types ----

interface Event {
  id: string;
  title: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ticketType: { name: string; price: number; currency: string };
  event: { id: string; title: string; slug: string; venue: string; city: string; startDate: string };
}

interface Order {
  id: string;
  orderNumber: string;
  guestName: string | null;
  guestEmail: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; phone: string | null } | null;
  items: OrderItem[];
  totalAmount: number;
  orgPayout: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  payment: { status: string; provider: string } | null;
  attendeeData: unknown;
  createdAt: string;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ticketTypeName: string;
  ticketCode: string;
  qrDataUrl?: string;
  status: 'ACTIVE' | 'CHECKED_IN' | 'CANCELLED';
  orderId: string;
  orderNumber: string;
}

interface AttendeeStats {
  total: number;
  checkedIn: number;
  active: number;
  cancelled: number;
}

// ---- Component ----

export default function OrganiserOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterEventId, setFilterEventId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Expanded order
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Resend loading
  const [resendingOrderId, setResendingOrderId] = useState<string | null>(null);
  const [resendConfirm, setResendConfirm] = useState<Order | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Attendees
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeeStats, setAttendeeStats] = useState<AttendeeStats>({ total: 0, checkedIn: 0, active: 0, cancelled: 0 });
  const [resendingAttendeeOrderId, setResendingAttendeeOrderId] = useState<string | null>(null);

  // ---- Data fetching ----

  const fetchEvents = async () => {
    try {
      const res = await apiClient.get('/events/my');
      setEvents(res.data.data || []);
    } catch {
      setEvents([]);
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterEventId) params.append('eventId', filterEventId);
      if (filterStatus) params.append('status', filterStatus);
      const query = params.toString();
      const res = await apiClient.get(`/orders/organiser${query ? `?${query}` : ''}`);
      const data = res.data.data;
      setOrders(Array.isArray(data) ? data : data?.orders || []);
    } catch {
      setOrders([]);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filterEventId, filterStatus]);

  const fetchAttendees = useCallback(async (eventId: string) => {
    setAttendeesLoading(true);
    try {
      const res = await apiClient.get(`/orders/organiser/event/${eventId}/attendees`);
      const data: Attendee[] = res.data.data || [];
      setAttendees(data);
      setAttendeeStats({
        total: data.length,
        checkedIn: data.filter((a) => a.status === 'CHECKED_IN').length,
        active: data.filter((a) => a.status === 'ACTIVE').length,
        cancelled: data.filter((a) => a.status === 'CANCELLED').length,
      });
    } catch {
      setAttendees([]);
      setAttendeeStats({ total: 0, checkedIn: 0, active: 0, cancelled: 0 });
    } finally {
      setAttendeesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (filterEventId) {
      fetchAttendees(filterEventId);
    } else {
      setAttendees([]);
      setAttendeeStats({ total: 0, checkedIn: 0, active: 0, cancelled: 0 });
    }
  }, [filterEventId, fetchAttendees]);

  // ---- Actions ----

  const openResendConfirm = (order: Order) => {
    setResendConfirm(order);
    setResendSuccess(false);
  };

  const handleResendTickets = async (orderId: string) => {
    setResendingOrderId(orderId);
    try {
      await apiClient.post(`/orders/organiser/${orderId}/resend-tickets`);
      setResendSuccess(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to resend tickets');
      setResendConfirm(null);
    } finally {
      setResendingOrderId(null);
    }
  };

  const handleResendForAttendee = async (orderId: string) => {
    setResendingAttendeeOrderId(orderId);
    try {
      await apiClient.post(`/orders/organiser/${orderId}/resend-tickets`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to resend tickets');
    } finally {
      setResendingAttendeeOrderId(null);
    }
  };

  // ---- Helpers ----

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { label: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' };
      case 'CONFIRMED':
        return { label: 'Confirmed', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
      case 'CANCELLED':
        return { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
      default:
        return { label: status, color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' };
    }
  };

  const getCheckinBadge = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return { label: 'Checked In', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
      case 'ACTIVE':
        return { label: 'Active', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' };
      case 'CANCELLED':
        return { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
      default:
        return { label: status, color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  };

  // ---- Render ----

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">View and manage orders for your events</p>
        </div>
        <Button variant="outline" onClick={() => fetchOrders()} className="self-start sm:self-auto">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={filterEventId}
          onChange={(e) => setFilterEventId(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All Events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>{event.title}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Orders list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">No orders found</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {filterEventId || filterStatus ? 'Try adjusting your filters' : 'Orders will appear here when customers purchase tickets'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="pb-3 pr-4">Order #</th>
                  <th className="pb-3 pr-4">Customer</th>
                  <th className="pb-3 pr-4">Event</th>
                  <th className="pb-3 pr-4">Items</th>
                  <th className="pb-3 pr-4">Amount</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Payment</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {orders.map((order) => {
                  const status = getStatusBadge(order.status);
                  return (
                    <tr key={order.id} className="group">
                      <td className="py-3 pr-4">
                        <span className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">{order.orderNumber}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-gray-900 dark:text-gray-100">{order.user ? `${order.user.firstName} ${order.user.lastName}` : order.guestName || 'Guest'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{order.user?.email || order.guestEmail || ''}</div>
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300 max-w-[160px] truncate">{order.items?.[0]?.event?.title || '-'}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                        {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">{formatCurrency(order.totalAmount)}</td>
                      <td className="py-3 pr-4">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', status.color)}>{status.label}</span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">{order.payment?.status || '-'}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedOrderId(order.id)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openResendConfirm(order)}
                              title="Resend tickets"
                              className="text-orange-600 dark:text-orange-400"
                            >
                              {resendingOrderId === order.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

          </div>

          {/* Mobile card layout */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => {
              const status = getStatusBadge(order.status);
              return (
                <Card key={order.id} className="cursor-pointer" onClick={() => setExpandedOrderId(order.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">{order.orderNumber}</span>
                        <span className={cn('ml-2 rounded-full px-2 py-0.5 text-xs font-medium', status.color)}>{status.label}</span>
                      </div>
                      <Eye className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{order.user ? `${order.user.firstName} ${order.user.lastName}` : order.guestName || 'Guest'}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[50%]">{order.items?.[0]?.event?.title || '-'}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(order.totalAmount)}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(order.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Order Detail Modal */}
      {expandedOrderId && (() => {
        const order = orders.find((o) => o.id === expandedOrderId);
        if (!order) return null;
        const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}` : order.guestName || 'Guest';
        const customerEmail = order.user?.email || order.guestEmail || '';
        const customerPhone = order.user?.phone || '';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setExpandedOrderId(null)}>
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-4 rounded-t-2xl">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Order Details</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{order.orderNumber}</p>
                </div>
                <button onClick={() => setExpandedOrderId(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-5">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', getStatusBadge(order.status).color)}>{getStatusBadge(order.status).label}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{order.payment?.status || '-'}</span>
                </div>

                {/* Customer Info */}
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Customer</h4>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{customerName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{customerEmail}</p>
                  {customerPhone && <p className="text-sm text-gray-500 dark:text-gray-400">{customerPhone}</p>}
                </div>

                {/* Event & Items */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Event</h4>
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">{order.items?.[0]?.event?.title || '-'}</p>

                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Items</h4>
                  <div className="space-y-2">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{item.ticketType?.name || 'Ticket'} x{item.quantity}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <span>Total Amount</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>Your Payout</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(order.orgPayout)}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{formatDate(order.createdAt)}</p>
                </div>

                {/* Actions */}
                {order.status === 'CONFIRMED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setExpandedOrderId(null); openResendConfirm(order); }}
                    className="w-full text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Resend Tickets
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Resend Confirmation Modal */}
      {resendConfirm && (() => {
        const order = resendConfirm;
        const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}` : order.guestName || 'Guest';
        const customerEmail = order.user?.email || order.guestEmail || '';
        const customerPhone = order.user?.phone || '';
        const eventTitle = order.items?.[0]?.event?.title || '-';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setResendConfirm(null); setResendSuccess(false); }}>
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {resendSuccess ? 'Tickets Sent!' : 'Resend Tickets'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{order.orderNumber}</p>
                </div>
                <button onClick={() => { setResendConfirm(null); setResendSuccess(false); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {resendSuccess ? (
                  <div className="text-center py-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                      <Send className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">Tickets have been sent to</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1">{customerEmail}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Ticket confirmation email will be sent with QR codes and event details.
                    </p>

                    <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Sending To</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{customerName}</p>
                        <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">{customerEmail}</p>
                        {customerPhone && <p className="text-xs text-gray-500 dark:text-gray-400">{customerPhone}</p>}
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Event</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{eventTitle}</p>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Items</p>
                        <div className="mt-1 space-y-1">
                          {order.items?.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{item.ticketType?.name || 'Ticket'} x{item.quantity}</span>
                              <span className="text-gray-900 dark:text-gray-100 font-medium">₹{Number(item.totalPrice).toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-gray-700 dark:text-gray-300">Total</span>
                          <span className="text-gray-900 dark:text-gray-100">₹{Number(order.totalAmount).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex justify-end gap-2">
                {resendSuccess ? (
                  <Button variant="outline" onClick={() => { setResendConfirm(null); setResendSuccess(false); }}>
                    Close
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setResendConfirm(null)}>Cancel</Button>
                    <Button
                      onClick={() => handleResendTickets(order.id)}
                      disabled={resendingOrderId === order.id}
                      className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    >
                      {resendingOrderId === order.id ? (
                        <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                      ) : (
                        <><Send className="mr-2 h-4 w-4" /> Send Tickets</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
