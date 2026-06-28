'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  IndianRupee, Ticket, CalendarDays, UserCheck, TrendingUp, TrendingDown, Crown,
  ArrowRight, Lock, BarChart3, Shield, AlertTriangle, CheckCircle, User, FileText, Upload,
  Sparkles, Zap,
} from 'lucide-react';

interface DashboardData {
  summary: {
    totalRevenue: number;
    totalTicketsSold: number;
    activeEvents: number;
    checkInRate: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
  };
  activeEvents: {
    id: string; title: string; slug: string; imageUrl: string | null;
    venue: string; startDate: string; status: string;
    revenue: number; ticketsSold: number; totalCapacity: number;
  }[];
  recentOrders: {
    id: string; orderNumber: string; customerName: string; customerInitial: string;
    eventTitle: string; ticketCount: number; amount: number; createdAt: string;
  }[];
  subscription: {
    tier: string; eventsUsed: number; eventsMax: number;
    staffUsed: number; staffMax: number; commission: number;
    commissionSource: 'plan' | 'custom'; planCommission: number;
    expiresAt: string | null;
  };
  topSellingEvents: { title: string; revenue: number; ticketsSold: number }[];
}

const statusBadge: Record<string, { label: string; color: string; dot: string }> = {
  PUBLISHED: { label: 'Live', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  DRAFT: { label: 'Draft', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300', dot: 'bg-gray-400' },
  PENDING_APPROVAL: { label: 'Pending', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', dot: 'bg-red-500' },
};

export default function OrganiserDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingAction, setRequestingAction] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [actionSent, setActionSent] = useState(false);

  const isSuspended = user?.status === 'SUSPENDED';
  const isRejected = user?.status === 'REJECTED';
  const isPending = user?.status === 'PENDING';
  const profileCompleted = (user as any)?.profileCompleted;
  const isBlocked = isSuspended || isRejected || isPending;

  useEffect(() => {
    if (isBlocked) { setLoading(false); return; }
    apiClient.get('/analytics/organiser/dashboard')
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isBlocked]);

  const handleRequestAction = async (endpoint: string) => {
    if (!actionReason.trim()) return;
    setRequestingAction(true);
    try {
      await apiClient.post(endpoint, { reason: actionReason });
      setActionSent(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to submit request');
    } finally {
      setRequestingAction(false);
    }
  };

  const tier = data?.subscription?.tier || 'FREE';
  const isPro = ['PRO', 'ADVANCE', 'ENTERPRISE'].includes(tier);
  const isAdvance = ['ADVANCE', 'ENTERPRISE'].includes(tier);

  return (
    <div className="space-y-6">
      {/* Status Banners */}
      {isRejected && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">Registration Rejected</h3>
          {(user as any)?.statusReason && (
            <div className="mt-2 rounded-lg bg-red-100 dark:bg-red-900/30 p-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Reason from Admin:</p>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{(user as any).statusReason}</p>
            </div>
          )}
          <p className="mt-3 text-sm text-red-700 dark:text-red-400">Please fix the issues and submit a re-approval request.</p>
          {actionSent ? (
            <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-400">Re-approval request submitted.</div>
          ) : (
            <div className="mt-4 space-y-3">
              <textarea placeholder="Explain what you've fixed..." value={actionReason} onChange={(e) => setActionReason(e.target.value)}
                className="w-full rounded-lg border border-red-200 dark:border-red-800 p-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:bg-gray-800 dark:text-gray-100" rows={3} />
              <Button onClick={() => handleRequestAction('/users/request-reapproval')} disabled={requestingAction || !actionReason.trim()} className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                {requestingAction ? 'Submitting...' : 'Request Re-approval'}
              </Button>
            </div>
          )}
        </div>
      )}

      {isSuspended && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">Account Suspended</h3>
          {(user as any)?.statusReason && (
            <div className="mt-2 rounded-lg bg-red-100 dark:bg-red-900/30 p-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Reason:</p>
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{(user as any).statusReason}</p>
            </div>
          )}
          {actionSent ? (
            <div className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-700 dark:text-green-400">Reactivation request submitted.</div>
          ) : (
            <div className="mt-4 space-y-3">
              <textarea placeholder="Explain why your account should be reactivated..." value={actionReason} onChange={(e) => setActionReason(e.target.value)}
                className="w-full rounded-lg border border-red-200 dark:border-red-800 p-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:bg-gray-800 dark:text-gray-100" rows={3} />
              <Button onClick={() => handleRequestAction('/users/request-reactivation')} disabled={requestingAction || !actionReason.trim()} className="bg-red-600 hover:bg-red-700 text-white">
                {requestingAction ? 'Submitting...' : 'Request Reactivation'}
              </Button>
            </div>
          )}
        </div>
      )}

      {isPending && profileCompleted && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Account Under Review</h3>
          </div>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">Your profile is complete. Our admin team is reviewing your documents. You will receive an email once your account is approved.</p>
          <p className="mt-1 text-xs text-amber-600/70 dark:text-amber-400/60">This usually takes 1-2 business days.</p>
        </div>
      )}

      {!profileCompleted && !isSuspended && !isRejected && (
        <CompleteProfileBanner user={user} />
      )}

      {isBlocked && !loading ? null : loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />)}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 h-80 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-80 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ) : data && (
        <>
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Welcome back, {(user as any)?.orgName || user?.firstName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Here&apos;s how your events are performing</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/organiser/subscriptions" className="flex items-center gap-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                <Crown className="h-3.5 w-3.5" />
                {tier} Plan
              </Link>
              <Link href="/organiser/events/create">
                <Button className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20">
                  <Sparkles className="mr-1.5 h-4 w-4" /> Create Event
                </Button>
              </Link>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-2xl border border-green-200/60 dark:border-green-800/40 bg-white dark:bg-gray-800 p-5 transition-all hover:shadow-lg hover:shadow-green-500/5 hover:-translate-y-0.5">
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-green-50 dark:bg-green-900/20 transition-transform group-hover:scale-150" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Revenue</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">₹{data.summary.totalRevenue.toLocaleString('en-IN')}</p>
                {data.summary.revenueThisMonth > 0 && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">₹{data.summary.revenueThisMonth.toLocaleString('en-IN')} this month</p>
                )}
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-blue-200/60 dark:border-blue-800/40 bg-white dark:bg-gray-800 p-5 transition-all hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5">
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-blue-50 dark:bg-blue-900/20 transition-transform group-hover:scale-150" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Ticket className="h-5 w-5 text-blue-600" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tickets Sold</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.totalTicketsSold.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-purple-200/60 dark:border-purple-800/40 bg-white dark:bg-gray-800 p-5 transition-all hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5">
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-purple-50 dark:bg-purple-900/20 transition-transform group-hover:scale-150" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <CalendarDays className="h-5 w-5 text-purple-600" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Live Events</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.activeEvents}</p>
              </div>
            </div>

            {isPro ? (
              <div className="group relative overflow-hidden rounded-2xl border border-orange-200/60 dark:border-orange-800/40 bg-white dark:bg-gray-800 p-5 transition-all hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5">
                <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-orange-50 dark:bg-orange-900/20 transition-transform group-hover:scale-150" />
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
                    <UserCheck className="h-5 w-5 text-orange-600" />
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Check-in Rate</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.checkInRate}%</p>
                  <p className="mt-1 text-xs text-orange-600 dark:text-orange-400 font-medium">Real-time</p>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-gray-800 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700">
                  <UserCheck className="h-5 w-5 text-gray-400" />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Check-in Rate</p>
                <p className="mt-1 text-2xl font-bold text-gray-200 dark:text-gray-700 select-none">--%</p>
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-[1px]">
                  <Link href="/organiser/subscriptions" className="flex flex-col items-center gap-1">
                    <Lock className="h-4 w-4 text-gray-400" />
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">PRO+</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Middle Section */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Live Events */}
            <Card className="lg:col-span-2 rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Live Events
                  </CardTitle>
                  <Link href="/organiser/events" className="flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors">
                    View All <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {data.activeEvents.length === 0 ? (
                  <div className="py-10 text-center">
                    <CalendarDays className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">No live events right now</p>
                    <Link href="/organiser/events/create">
                      <Button size="sm" variant="outline" className="mt-3 text-xs">Create Your Event</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.activeEvents.map((event) => {
                      const badge = statusBadge[event.status] || { label: event.status, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
                      const pct = event.totalCapacity > 0 ? Math.round((event.ticketsSold / event.totalCapacity) * 100) : 0;
                      return (
                        <Link key={event.id} href={`/organiser/events/${event.id}`} className="block rounded-xl border border-gray-100 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {event.imageUrl ? (
                              <img src={event.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover shrink-0" />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/20 text-sm font-bold text-orange-600 shrink-0">
                                {event.title[0]}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{event.title}</p>
                                <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', badge.color)}>
                                  <span className={cn('h-1.5 w-1.5 rounded-full', badge.dot)} />
                                  {badge.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {new Date(event.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} &middot; {event.venue}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">₹{event.revenue.toLocaleString('en-IN')}</p>
                              <p className="text-[10px] text-gray-400">{event.ticketsSold}/{event.totalCapacity} sold</p>
                            </div>
                          </div>
                          <div className="mt-2 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-orange-500' : 'bg-blue-500')} style={{ width: `${pct}%` }} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                  <Link href="/organiser/orders" className="flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors">
                    View All <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {data.recentOrders.length === 0 ? (
                  <div className="py-10 text-center">
                    <Ticket className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="mt-3 text-sm text-gray-400 dark:text-gray-500">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.recentOrders.slice(0, 4).map((order, i) => (
                      <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-orange-400 to-orange-600 text-xs font-bold text-white shadow-sm">
                            {order.customerInitial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{order.customerName}</p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{order.eventTitle} &middot; {order.ticketCount} ticket{order.ticketCount > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-green-600 whitespace-nowrap">+₹{order.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Plan Usage */}
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-orange-500" /> Plan Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <UsageBar label="Events this month" used={data.subscription.eventsUsed} max={data.subscription.eventsMax} />
                <UsageBar label="Staff accounts" used={data.subscription.staffUsed} max={data.subscription.staffMax} />
                <div className="flex items-center justify-between rounded-xl bg-linear-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-3 border border-orange-100 dark:border-orange-800/30">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Commission</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-orange-600">{data.subscription.commission}%</span>
                    <span className="ml-1.5 rounded-full bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
                      {data.subscription.commissionSource === 'custom' ? 'Custom' : 'Plan'}
                    </span>
                  </div>
                </div>
                {data.subscription.expiresAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                    Expires: {new Date(data.subscription.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Monthly Revenue */}
            {isPro ? (
              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-blue-500" /> Monthly Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">₹{data.summary.revenueThisMonth.toLocaleString('en-IN')}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This month</p>
                    {data.summary.revenueLastMonth > 0 && (() => {
                      const change = Math.round(((data.summary.revenueThisMonth - data.summary.revenueLastMonth) / data.summary.revenueLastMonth) * 100);
                      const isUp = change >= 0;
                      return (
                        <div className={cn('mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold', isUp ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600')}>
                          {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {isUp ? '+' : ''}{change}% vs last month
                        </div>
                      );
                    })()}
                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">Last month: ₹{data.summary.revenueLastMonth.toLocaleString('en-IN')}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <LockedWidget title="Monthly Revenue" plan="PRO" icon={<BarChart3 className="h-5 w-5 text-blue-500" />} />
            )}

            {/* Top Sellers */}
            {isAdvance ? (
              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-green-500" /> Top Sellers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topSellingEvents.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {data.topSellingEvents.slice(0, 5).map((e, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                              i === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700' :
                              i === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' :
                              i === 2 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            )}>{i + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{e.title}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{e.ticketsSold} tickets</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">₹{e.revenue.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <LockedWidget title="Top Sellers" plan="ADVANCE" icon={<TrendingUp className="h-5 w-5 text-green-500" />} />
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { href: '/organiser/events', label: 'My Events', icon: CalendarDays, color: 'group-hover:text-purple-600' },
              { href: '/organiser/orders', label: 'Orders', icon: Ticket, color: 'group-hover:text-blue-600' },
              { href: '/organiser/settlements', label: 'Settlements', icon: IndianRupee, color: 'group-hover:text-green-600' },
              { href: '/organiser/analytics', label: 'Analytics', icon: BarChart3, color: 'group-hover:text-orange-600' },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}>
                  <div className="group flex items-center gap-3 rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-gray-800 p-3.5 hover:border-orange-200 dark:hover:border-orange-800/40 hover:shadow-md transition-all cursor-pointer">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-2 transition-colors group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20">
                      <Icon className={cn('h-4 w-4 text-gray-400 transition-colors', action.color)} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">{action.label}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-gray-300 dark:text-gray-600 group-hover:text-orange-500 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function LockedWidget({ title, plan, icon }: { title: string; plan: string; icon: React.ReactNode }) {
  return (
    <Card className="relative overflow-hidden rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 mb-3">
            <Lock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{plan}+ Feature</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Upgrade to unlock {title.toLowerCase()}</p>
          <Link href="/organiser/subscriptions">
            <Button size="sm" className="mt-4 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20">
              <Zap className="mr-1 h-3.5 w-3.5" /> Upgrade to {plan}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(Math.round((used / max) * 100), 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-300">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{used}/{max >= 999 ? '∞' : max}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={cn('h-2 rounded-full transition-all duration-700', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-linear-to-r from-orange-500 to-amber-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CompleteProfileBanner({ user }: { user: any }) {
  const userAny = user as any;

  const checks = [
    { label: 'Full Name', done: !!(user?.firstName && user?.lastName), icon: <User className="h-4 w-4" /> },
    { label: 'Organisation Name', done: !!userAny?.orgName, icon: <Shield className="h-4 w-4" /> },
    { label: 'Email Verified', done: !!user?.emailVerified, icon: <CheckCircle className="h-4 w-4" /> },
    { label: 'Aadhaar Card', done: !!userAny?.aadharDocumentUrl, icon: <Upload className="h-4 w-4" /> },
    { label: 'PAN Card', done: !!userAny?.panDocumentUrl, icon: <FileText className="h-4 w-4" /> },
    { label: 'GST Number (Optional)', done: !!userAny?.gstNumber, icon: <FileText className="h-4 w-4" />, optional: true },
  ];

  const required = checks.filter(c => !c.optional);
  const completedCount = required.filter(c => c.done).length;
  const pct = Math.round((completedCount / required.length) * 100);

  return (
    <div className="rounded-2xl border border-orange-200 dark:border-orange-800 bg-linear-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Complete Your Profile</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Complete the steps below to get your account approved and start creating events.
          </p>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-2.5 flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-2.5 rounded-full bg-linear-to-r from-orange-500 to-amber-500 transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-bold text-orange-600">{completedCount}/{required.length}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {checks.map((check) => (
              <div
                key={check.label}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors',
                  check.done
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : check.optional
                      ? 'bg-white/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm',
                )}
              >
                {check.done ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                ) : (
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
                <span className={check.done ? 'line-through' : 'font-medium'}>{check.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Link href="/organiser/profile">
          <Button className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 whitespace-nowrap">
            Go to Profile
          </Button>
        </Link>
      </div>
    </div>
  );
}
