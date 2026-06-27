'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ShoppingCart,
  ChevronDown,
  ChevronUp,
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
  ticketTierName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  event: {
    id: string;
    title: string;
  };
  items: OrderItem[];
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  paymentStatus: string;
  createdAt: string;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ticketTierName: string;
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
      setOrders(res.data.data || []);
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

  const handleResendTickets = async (orderId: string) => {
    setResendingOrderId(orderId);
    try {
      await apiClient.post(`/orders/organiser/${orderId}/resend-tickets`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to resend tickets');
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
                  const isExpanded = expandedOrderId === order.id;
                  return (
                    <tr key={order.id} className="group">
                      <td className="py-3 pr-4">
                        <span className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">{order.orderNumber}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-gray-900 dark:text-gray-100">{order.customerName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{order.customerEmail}</div>
                      </td>
                      <td className="py-3 pr-4 text-gray-700 dark:text-gray-300 max-w-[160px] truncate">{order.event.title}</td>
                      <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                        {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">{formatCurrency(order.totalAmount)}</td>
                      <td className="py-3 pr-4">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', status.color)}>{status.label}</span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">{order.paymentStatus}</td>
                      <td className="py-3 pr-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            title="View details"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          {order.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResendTickets(order.id)}
                              disabled={resendingOrderId === order.id}
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

            {/* Expanded order detail (inline) */}
            {expandedOrderId && (() => {
              const order = orders.find((o) => o.id === expandedOrderId);
              if (!order) return null;
              return (
                <Card className="mt-2 mb-4 border-orange-200 dark:border-orange-800/40">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Order {order.orderNumber} - Details</h3>
                      <button onClick={() => setExpandedOrderId(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Customer</span>
                        <p className="text-gray-900 dark:text-gray-100">{order.customerName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{order.customerEmail}</p>
                        {order.customerPhone && <p className="text-xs text-gray-500 dark:text-gray-400">{order.customerPhone}</p>}
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Event</span>
                        <p className="text-gray-900 dark:text-gray-100">{order.event.title}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Total Amount</span>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatCurrency(order.totalAmount)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Order Date</span>
                        <p className="text-gray-900 dark:text-gray-100">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">Items</h4>
                        <div className="space-y-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
                              <span className="text-gray-700 dark:text-gray-300">{item.ticketTierName} x{item.quantity}</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(item.totalPrice)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Mobile card layout */}
          <div className="md:hidden space-y-3">
            {orders.map((order) => {
              const status = getStatusBadge(order.status);
              const isExpanded = expandedOrderId === order.id;
              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono text-xs font-semibold text-gray-900 dark:text-gray-100">{order.orderNumber}</span>
                        <span className={cn('ml-2 rounded-full px-2 py-0.5 text-xs font-medium', status.color)}>{status.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{order.customerName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.customerEmail}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[50%]">{order.event.title}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(order.totalAmount)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''} | {order.paymentStatus}</span>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
                        {order.customerPhone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">Phone: {order.customerPhone}</p>
                        )}
                        {order.items && order.items.length > 0 && (
                          <div className="space-y-1">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs">
                                <span className="text-gray-700 dark:text-gray-300">{item.ticketTierName} x{item.quantity}</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(item.totalPrice)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResendTickets(order.id)}
                            disabled={resendingOrderId === order.id}
                            className="w-full text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                          >
                            {resendingOrderId === order.id ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            Resend Tickets
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ---- Attendees Section ---- */}
      {filterEventId && (
        <div className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                Attendees
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {events.find((e) => e.id === filterEventId)?.title || 'Selected event'}
              </p>
            </div>
            {attendees.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const res = await apiClient.get(`/orders/organiser/event/${filterEventId}/attendees/export`, { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `attendees_${filterEventId}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                  } catch { alert('Failed to export attendees'); }
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            )}
          </div>

          {/* Stats cards */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-3 text-center">
                <Ticket className="mx-auto h-5 w-5 text-orange-500 mb-1" />
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{attendeeStats.total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Total Tickets</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="mx-auto h-5 w-5 text-green-500 mb-1" />
                <div className="text-xl font-bold text-green-600 dark:text-green-400">{attendeeStats.checkedIn}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Checked In</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Ticket className="mx-auto h-5 w-5 text-blue-500 mb-1" />
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{attendeeStats.active}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <XCircle className="mx-auto h-5 w-5 text-red-500 mb-1" />
                <div className="text-xl font-bold text-red-600 dark:text-red-400">{attendeeStats.cancelled}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Cancelled</div>
              </CardContent>
            </Card>
          </div>

          {/* Attendees table / cards */}
          {attendeesLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
              ))}
            </div>
          ) : attendees.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No attendees found for this event</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop attendee table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <th className="pb-3 pr-4">Attendee</th>
                      <th className="pb-3 pr-4">Contact</th>
                      <th className="pb-3 pr-4">Ticket Type</th>
                      <th className="pb-3 pr-4">Ticket Code</th>
                      <th className="pb-3 pr-4">QR</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {attendees.map((attendee) => {
                      const checkinStatus = getCheckinBadge(attendee.status);
                      return (
                        <tr key={attendee.id}>
                          <td className="py-3 pr-4">
                            <div className="text-gray-900 dark:text-gray-100">{attendee.name}</div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="text-xs text-gray-600 dark:text-gray-300">{attendee.email}</div>
                            {attendee.phone && <div className="text-xs text-gray-500 dark:text-gray-400">{attendee.phone}</div>}
                          </td>
                          <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{attendee.ticketTierName}</td>
                          <td className="py-3 pr-4">
                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{attendee.ticketCode}</span>
                          </td>
                          <td className="py-3 pr-4">
                            {attendee.qrDataUrl ? (
                              <img src={attendee.qrDataUrl} alt="QR" className="h-10 w-10 rounded" />
                            ) : (
                              <span className="text-xs text-gray-400">--</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', checkinStatus.color)}>
                              {checkinStatus.label}
                            </span>
                          </td>
                          <td className="py-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResendForAttendee(attendee.orderId)}
                              disabled={resendingAttendeeOrderId === attendee.orderId}
                              title="Resend tickets"
                              className="text-orange-600 dark:text-orange-400"
                            >
                              {resendingAttendeeOrderId === attendee.orderId ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile attendee cards */}
              <div className="md:hidden space-y-3">
                {attendees.map((attendee) => {
                  const checkinStatus = getCheckinBadge(attendee.status);
                  return (
                    <Card key={attendee.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{attendee.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{attendee.email}</p>
                            {attendee.phone && <p className="text-xs text-gray-500 dark:text-gray-400">{attendee.phone}</p>}
                          </div>
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', checkinStatus.color)}>
                            {checkinStatus.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                          <span>{attendee.ticketTierName}</span>
                          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{attendee.ticketCode}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          {attendee.qrDataUrl ? (
                            <img src={attendee.qrDataUrl} alt="QR" className="h-12 w-12 rounded" />
                          ) : (
                            <span className="text-xs text-gray-400">No QR</span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResendForAttendee(attendee.orderId)}
                            disabled={resendingAttendeeOrderId === attendee.orderId}
                            className="text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                          >
                            {resendingAttendeeOrderId === attendee.orderId ? (
                              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="mr-1 h-3 w-3" />
                            )}
                            Resend
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
