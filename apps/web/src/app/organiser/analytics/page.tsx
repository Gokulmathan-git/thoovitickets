'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EventAnalytics {
  id: string;
  title: string;
  status: string;
  startDate: string;
  category: string;
  revenue: number;
  ticketsSold: number;
  totalCapacity: number;
  occupancyRate: number;
  ticketBreakdown: {
    name: string;
    price: number;
    totalQty: number;
    soldQty: number;
    revenue: number;
  }[];
}

interface RecentOrder {
  orderNumber: string;
  eventTitle: string;
  ticketType: string;
  quantity: number;
  amount: number;
  customerName: string;
  customerEmail: string;
  date: string;
}

interface AnalyticsData {
  summary: {
    totalEvents: number;
    publishedEvents: number;
    totalRevenue: number;
    totalTicketsSold: number;
  };
  events: EventAnalytics[];
  recentOrders: RecentOrder[];
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/analytics/organiser')
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200" />)}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Analytics</h1>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">₹{data.summary.totalRevenue.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Tickets Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{data.summary.totalTicketsSold}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{data.summary.totalEvents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Published Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{data.summary.publishedEvents}</p>
          </CardContent>
        </Card>
      </div>

      {/* Event Performance Table */}
      {data.events.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Event Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Event</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium text-right">Tickets</th>
                    <th className="pb-3 font-medium text-right">Occupancy</th>
                    <th className="pb-3 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((event) => (
                    <tr key={event.id} className="border-b border-gray-100">
                      <td className="py-3">
                        <p className="font-medium text-gray-900">{event.title}</p>
                        <p className="text-xs text-gray-400">{event.category}</p>
                      </td>
                      <td className="py-3">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[event.status] || 'bg-gray-100')}>
                          {event.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(event.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </td>
                      <td className="py-3 text-right">
                        <span className="font-medium">{event.ticketsSold}</span>
                        <span className="text-gray-400">/{event.totalCapacity}</span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-2 w-16 rounded-full bg-gray-200">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${Math.min(event.occupancyRate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{event.occupancyRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-medium text-green-600">
                        ₹{event.revenue.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      {data.recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Order</th>
                    <th className="pb-3 font-medium">Event</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Ticket</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                    <th className="pb-3 font-medium text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 font-mono text-xs text-gray-600">{order.orderNumber}</td>
                      <td className="py-2 text-gray-700">{order.eventTitle}</td>
                      <td className="py-2">
                        <p className="text-gray-700">{order.customerName}</p>
                        <p className="text-xs text-gray-400">{order.customerEmail}</p>
                      </td>
                      <td className="py-2 text-gray-600">
                        {order.ticketType} x{order.quantity}
                      </td>
                      <td className="py-2 text-right font-medium text-gray-900">
                        ₹{order.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 text-right text-xs text-gray-400">
                        {new Date(order.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {data.events.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No analytics data yet</p>
            <p className="mt-1 text-sm text-gray-400">Create and publish events to see performance metrics here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
