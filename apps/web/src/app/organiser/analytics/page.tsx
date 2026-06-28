'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Lock, IndianRupee, Ticket, CalendarDays, Award, BarChart3, TrendingUp, Zap, Crown } from 'lucide-react';

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

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200', dot: 'bg-gray-400' },
  PENDING_APPROVAL: { label: 'Pending', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  PUBLISHED: { label: 'Live', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  COMPLETED: { label: 'Completed', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', dot: 'bg-red-500' },
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [tier, setTier] = useState<string>('FREE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/analytics/organiser'),
      apiClient.get('/subscriptions/my'),
    ]).then(([analyticsRes, subRes]) => {
      setData(analyticsRes.data.data);
      setTier(subRes.data.data?.tier || 'FREE');
    }).finally(() => setLoading(false));
  }, []);

  const isPro = ['PRO', 'ADVANCE', 'ENTERPRISE'].includes(tier);
  const isAdvance = ['ADVANCE', 'ENTERPRISE'].includes(tier);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />)}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
            <BarChart3 className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track your event performance</p>
          </div>
        </div>
        <Link href="/organiser/subscriptions" className="flex items-center gap-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 self-start">
          <Crown className="h-3.5 w-3.5" /> {tier} Plan
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: IndianRupee, bg: 'border-green-200/60 dark:border-green-800/40', iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600', label: 'Total Revenue', value: `₹${data.summary.totalRevenue.toLocaleString('en-IN')}`, accent: 'text-green-600' },
          { icon: Ticket, bg: 'border-blue-200/60 dark:border-blue-800/40', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600', label: 'Tickets Sold', value: String(data.summary.totalTicketsSold), accent: '' },
          { icon: CalendarDays, bg: 'border-purple-200/60 dark:border-purple-800/40', iconBg: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600', label: 'Total Events', value: String(data.summary.totalEvents), accent: '' },
          { icon: Award, bg: 'border-orange-200/60 dark:border-orange-800/40', iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600', label: 'Published Events', value: String(data.summary.publishedEvents), accent: '' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={cn('group relative overflow-hidden rounded-2xl border bg-white dark:bg-gray-800 p-5 transition-all hover:shadow-lg hover:-translate-y-0.5', card.bg)}>
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gray-50 dark:bg-gray-700/30 transition-transform group-hover:scale-150" />
              <div className="relative">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', card.iconBg)}>
                  <Icon className={cn('h-5 w-5', card.iconColor)} />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className={cn('mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100', card.accent)}>{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Performance */}
      {data.events.length > 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-orange-500" /> Event Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.events.map((event) => {
                const config = statusConfig[event.status] || statusConfig.DRAFT;
                const pct = event.totalCapacity > 0 ? Math.round((event.ticketsSold / event.totalCapacity) * 100) : 0;
                return (
                  <div key={event.id} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{event.title}</p>
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', config.color)}>
                            {event.status === 'PUBLISHED' && <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />}
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {event.category} &middot; {new Date(event.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-gray-900 dark:text-gray-100">{event.ticketsSold}<span className="text-gray-400 font-normal">/{event.totalCapacity}</span></p>
                          <p className="text-[10px] text-gray-400">Tickets</p>
                        </div>
                        {isPro && (
                          <>
                            <div className="text-center">
                              <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-12 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                  <div className={cn('h-full rounded-full', pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-orange-500' : 'bg-gray-400')} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{pct}%</span>
                              </div>
                              <p className="text-[10px] text-gray-400">Occupancy</p>
                            </div>
                            <div className="text-center">
                              <p className="font-bold text-green-600">₹{event.revenue.toLocaleString('en-IN')}</p>
                              <p className="text-[10px] text-gray-400">Revenue</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isPro && (
              <LockedBanner text="Upgrade to PRO to see occupancy rates and revenue per event" plan="PRO" />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-500 dark:text-gray-400">No analytics data yet</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Create and publish events to see performance metrics</p>
          </CardContent>
        </Card>
      )}

      {/* Ticket Breakdown — ADVANCE+ */}
      {isAdvance ? (
        data.events.filter((e) => e.ticketBreakdown.length > 0).length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Ticket className="h-5 w-5 text-blue-500" /> Ticket Type Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.events.filter((e) => e.ticketBreakdown.length > 0).slice(0, 5).map((event) => (
                  <div key={event.id}>
                    <h3 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">{event.title}</h3>
                    <div className="space-y-2">
                      {event.ticketBreakdown.map((tb) => {
                        const tbPct = tb.totalQty > 0 ? Math.round((tb.soldQty / tb.totalQty) * 100) : 0;
                        return (
                          <div key={tb.name} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{tb.name}</p>
                              <p className="text-xs text-gray-400">₹{tb.price.toLocaleString('en-IN')} &middot; {tb.soldQty}/{tb.totalQty} sold</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                <div className={cn('h-full rounded-full', tbPct >= 80 ? 'bg-green-500' : tbPct >= 40 ? 'bg-orange-500' : 'bg-gray-400')} style={{ width: `${tbPct}%` }} />
                              </div>
                              <span className="text-sm font-bold text-green-600 w-20 text-right">₹{tb.revenue.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <LockedSection title="Ticket Type Breakdown" icon={<Ticket className="h-5 w-5 text-blue-500" />} plan="ADVANCE" />
      )}

      {/* Recent Orders — PRO+ */}
      {isPro ? (
        data.recentOrders.length > 0 && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <IndianRupee className="h-5 w-5 text-green-500" /> Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.recentOrders.map((order, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-orange-400 to-orange-600 text-xs font-bold text-white">
                        {order.customerName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{order.customerName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{order.eventTitle} &middot; {order.ticketType} x{order.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-green-600">₹{order.amount.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-gray-400">{new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <LockedSection title="Recent Orders" icon={<IndianRupee className="h-5 w-5 text-green-500" />} plan="PRO" />
      )}
    </div>
  );
}

function LockedBanner({ text, plan }: { text: string; plan: string }) {
  return (
    <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 mb-2">
        <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
      <Link href="/organiser/subscriptions">
        <Button size="sm" className="mt-3 rounded-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20">
          <Zap className="mr-1 h-3.5 w-3.5" /> Upgrade to {plan}
        </Button>
      </Link>
    </div>
  );
}

function LockedSection({ title, icon, plan }: { title: string; icon: React.ReactNode; plan: string }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 mb-3">
            <Lock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{plan}+ Feature</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Upgrade to unlock {title.toLowerCase()}</p>
          <Link href="/organiser/subscriptions">
            <Button size="sm" className="mt-4 rounded-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20">
              <Zap className="mr-1 h-3.5 w-3.5" /> Upgrade to {plan}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
