'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ticketType: {
    name: string;
    price: number;
    currency: string;
  };
  event: {
    id: string;
    title: string;
    slug: string;
    venue: string;
    city: string;
    startDate: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  platformFee: number;
  guestName: string | null;
  guestEmail: string | null;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  items: OrderItem[];
  payment: {
    status: string;
    provider: string;
  } | null;
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  PENDING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const STATUS_OPTIONS = ['All', 'PENDING', 'CONFIRMED', 'CANCELLED'] as const;

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;

      const res = await apiClient.get('/admin/orders', { params });
      const data = res.data.data;
      setOrders(data.orders || data.items || data);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || data.totalCount || 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFrom, dateTo]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Orders</h1>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              />
            </div>

            {/* Date To */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              />
            </div>

            {/* Clear Filters */}
            {(statusFilter !== 'All' || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStatusFilter('All'); setDateFrom(''); setDateTo(''); }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      {!loading && (
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          {totalCount} order{totalCount !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">No orders found</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Order #</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Event</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right hidden sm:table-cell">Platform Fee</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const isExpanded = expandedId === order.id;
                    return (
                      <OrderRow
                        key={order.id}
                        order={order}
                        isExpanded={isExpanded}
                        onToggle={() => setExpandedId(isExpanded ? null : order.id)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrderRow({ order, isExpanded, onToggle }: { order: Order; isExpanded: boolean; onToggle: () => void }) {
  const customerName = order.user
    ? `${order.user.firstName} ${order.user.lastName}`
    : order.guestName || 'Guest';
  const customerEmail = order.user?.email || order.guestEmail || '';
  const eventTitle = order.items[0]?.event?.title || '-';
  const paymentProvider = order.payment?.provider;

  return (
    <>
      <tr
        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-gray-100">
          {order.orderNumber}
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {customerName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{customerEmail}</p>
        </td>
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 hidden md:table-cell max-w-[200px] truncate">
          {eventTitle}
        </td>
        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
          ₹{Number(order.totalAmount).toLocaleString('en-IN')}
        </td>
        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 hidden sm:table-cell">
          ₹{Number(order.platformFee).toLocaleString('en-IN')}
        </td>
        <td className="px-4 py-3">
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[order.status])}>
            {order.status}
          </span>
        </td>
        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden sm:table-cell whitespace-nowrap">
          {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
        </td>
        <td className="px-4 py-3">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </td>
      </tr>

      {/* Expanded Details */}
      {isExpanded && (
        <tr>
          <td colSpan={8} className="bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
            <div className="space-y-3">
              {/* Mobile-only info */}
              <div className="sm:hidden space-y-1 text-sm">
                <p className="text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span> {customerEmail}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Date:</span>{' '}
                  {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </p>
              </div>

              <div className="md:hidden text-sm">
                <p className="text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Event:</span> {eventTitle}
                </p>
              </div>

              {/* Payment Info */}
              {paymentProvider && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <p className="text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Payment:</span> {paymentProvider} ({order.payment?.status})
                  </p>
                </div>
              )}

              {/* Order Items */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Items
                </p>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700/50 text-left">
                        <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400">Ticket</th>
                        <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400 text-center">Qty</th>
                        <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400 text-right">Unit Price</th>
                        <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items?.map((item) => (
                        <tr key={item.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.ticketType.name}</td>
                          <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">₹{Number(item.unitPrice).toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-gray-100">₹{Number(item.totalPrice).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
