'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Lock, IndianRupee, Ticket, CalendarDays, Award } from 'lucide-react';

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
  ticketBreakdown: { name: string; price: number; totalQty: number; soldQty: number; revenue: number }[];
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
  summary: { totalEvents: number; publishedEvents: number; totalRevenue: number; totalTicketsSold: number };
  events: EventAnalytics[];
  recentOrders: RecentOrder[];
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  PENDING_APPROVAL: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  PUBLISHED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [tier, setTier] = useState<string>('FREE');
  const [commission, setCommission] = useState<number>(4);
  const [commissionSource, setCommissionSource] = useState<string>('plan');
  const [planCommission, setPlanCommission] = useState<number>(4);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/analytics/organiser'),
      apiClient.get('/subscriptions/my'),
      apiClient.get('/analytics/organiser/dashboard'),
    ]).then(([analyticsRes, subRes, dashRes]) => {
      setData(analyticsRes.data.data);
      setTier(subRes.data.data?.tier || 'FREE');
      const sub = dashRes.data.data?.subscription;
      if (sub) {
        setCommission(sub.commission);
        setCommissionSource(sub.commissionSource || 'plan');
        setPlanCommission(sub.planCommission || sub.commission);
      }
    }).finally(() => setLoading(false));
  }, []);

  const isPro = ['PRO', 'ADVANCE', 'ENTERPRISE'].includes(tier);
  const isAdvance = ['ADVANCE', 'ENTERPRISE'].includes(tier);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Analytics</h1>
        <span className="self-start rounded-full bg-orange-100 dark:bg-orange-900/30 px-3 py-1 text-xs font-semibold text-orange-700">{tier} Plan</span>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<IndianRupee className="h-5 w-5" />} iconBg="bg-green-100 dark:bg-green-900/30 text-green-600" label="Total Revenue" value={`₹${data.summary.totalRevenue.toLocaleString('en-IN')}`} />
        <SummaryCard icon={<Ticket className="h-5 w-5" />} iconBg="bg-blue-100 dark:bg-blue-900/20 text-blue-600" label="Tickets Sold" value={String(data.summary.totalTicketsSold)} />
        <SummaryCard icon={<CalendarDays className="h-5 w-5" />} iconBg="bg-purple-100 dark:bg-purple-900/30 text-purple-600" label="Total Events" value={String(data.summary.totalEvents)} />
        <SummaryCard icon={<Award className="h-5 w-5" />} iconBg="bg-orange-100 dark:bg-orange-900/30 text-orange-600" label="Published Events" value={String(data.summary.publishedEvents)} />
      </div>

      {/* Event Performance Table */}
      {data.events.length > 0 ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Event Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-3 font-medium">Event</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium text-right">Tickets</th>
                    {isPro && <th className="pb-3 font-medium text-right">Occupancy</th>}
                    {isPro && <th className="pb-3 font-medium text-right">Revenue</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((event) => (
                    <tr key={event.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{event.title}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{event.category}</p>
                      </td>
                      <td className="py-3">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[event.status] || 'bg-gray-100')}>{event.status}</span>
                      </td>
                      <td className="py-3 text-gray-500 dark:text-gray-400">{new Date(event.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                      <td className="py-3 text-right">
                        <span className="font-medium">{event.ticketsSold}</span>
                        <span className="text-gray-400 dark:text-gray-500">/{event.totalCapacity}</span>
                      </td>
                      {isPro && (
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700">
                              <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(event.occupancyRate, 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-300">{event.occupancyRate}%</span>
                          </div>
                        </td>
                      )}
                      {isPro && (
                        <td className="py-3 text-right font-medium text-green-600">₹{event.revenue.toLocaleString('en-IN')}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isPro && (
              <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-900 p-4 text-center">
                <Lock className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Upgrade to PRO to see occupancy rates and revenue per event</p>
                <Link href="/organiser/subscriptions"><Button size="sm" className="mt-2 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">Upgrade to PRO</Button></Link>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No analytics data yet</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Create and publish events to see performance metrics here</p>
          </CardContent>
        </Card>
      )}

      {/* Ticket Breakdown — ADVANCE+ */}
      {isAdvance ? (
        data.events.filter((e) => e.ticketBreakdown.length > 0).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Ticket Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.events.filter((e) => e.ticketBreakdown.length > 0).slice(0, 5).map((event) => (
                  <div key={event.id}>
                    <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs text-gray-500 dark:text-gray-400">
                            <th className="pb-2 font-medium">Ticket Type</th>
                            <th className="pb-2 font-medium text-right">Price</th>
                            <th className="pb-2 font-medium text-right">Sold / Total</th>
                            <th className="pb-2 font-medium text-right">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {event.ticketBreakdown.map((tb) => (
                            <tr key={tb.name} className="border-b border-gray-50 dark:border-gray-800">
                              <td className="py-2 font-medium text-gray-700 dark:text-gray-200">{tb.name}</td>
                              <td className="py-2 text-right text-gray-600 dark:text-gray-300">₹{tb.price.toLocaleString('en-IN')}</td>
                              <td className="py-2 text-right">
                                <span className="font-medium">{tb.soldQty}</span>
                                <span className="text-gray-400 dark:text-gray-500">/{tb.totalQty}</span>
                              </td>
                              <td className="py-2 text-right font-medium text-green-600">₹{tb.revenue.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Ticket Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-8">
              <Lock className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Available on ADVANCE+ plan</p>
              <Link href="/organiser/subscriptions"><Button size="sm" className="mt-3 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">Upgrade to ADVANCE</Button></Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders — PRO+ */}
      {isPro ? (
        data.recentOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
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
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 font-mono text-xs text-gray-600 dark:text-gray-300">{order.orderNumber}</td>
                        <td className="py-2 text-gray-700 dark:text-gray-200">{order.eventTitle}</td>
                        <td className="py-2">
                          <p className="text-gray-700 dark:text-gray-200">{order.customerName}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{order.customerEmail}</p>
                        </td>
                        <td className="py-2 text-gray-600 dark:text-gray-300">{order.ticketType} x{order.quantity}</td>
                        <td className="py-2 text-right font-medium text-green-600">₹{order.amount.toLocaleString('en-IN')}</td>
                        <td className="py-2 text-right text-xs text-gray-400 dark:text-gray-500">{new Date(order.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-8">
              <Lock className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">Available on PRO+ plan</p>
              <Link href="/organiser/subscriptions"><Button size="sm" className="mt-3 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">Upgrade to PRO</Button></Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ icon, iconBg, label, value }: { icon: React.ReactNode; iconBg: string; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', iconBg)}>{icon}</div>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}
