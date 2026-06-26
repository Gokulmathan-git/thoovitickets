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

const statusBadge: Record<string, { label: string; color: string }> = {
  PUBLISHED: { label: 'Live', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  DRAFT: { label: 'Draft', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300' },
  PENDING_APPROVAL: { label: 'Pending', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
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
    <div>
      {/* Status Banners */}
      {isRejected && (
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5">
          <h3 className="text-lg font-semibold text-red-800">Registration Rejected</h3>
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
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5">
          <h3 className="text-lg font-semibold text-red-800">Account Suspended</h3>
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
        <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">Account Under Review</h3>
          </div>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            Your profile is complete. Our admin team is reviewing your documents. You will receive an email once your account is approved.
          </p>
          <p className="mt-1 text-xs text-amber-600/70 dark:text-amber-400/60">
            This usually takes 1-2 business days.
          </p>
        </div>
      )}

      {!profileCompleted && !isSuspended && !isRejected && (
        <CompleteProfileBanner user={user} />
      )}

      {isBlocked && !loading && <div />}
      {isBlocked && !loading ? null : loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />)}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 h-80 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-80 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ) : data && (
        <>
          {/* Header */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
                Welcome, {(user as any)?.orgName || user?.firstName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your performance snapshot</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/organiser/subscriptions" className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                <Crown className="h-3.5 w-3.5 text-orange-500" />
                {tier} Plan
              </Link>
              <Link href="/organiser/events/create">
                <Button className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">Create Event</Button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<IndianRupee className="h-5 w-5" />}
              iconBg="bg-green-100 dark:bg-green-900/30 text-green-600"
              label="Total Revenue"
              value={`₹${data.summary.totalRevenue.toLocaleString('en-IN')}`}
              sub={data.summary.revenueThisMonth > 0 ? `₹${data.summary.revenueThisMonth.toLocaleString('en-IN')} this month` : undefined}
            />
            <StatCard
              icon={<Ticket className="h-5 w-5" />}
              iconBg="bg-blue-100 dark:bg-blue-900/20 text-blue-600"
              label="Tickets Sold"
              value={data.summary.totalTicketsSold.toLocaleString('en-IN')}
            />
            <StatCard
              icon={<CalendarDays className="h-5 w-5" />}
              iconBg="bg-purple-100 text-purple-600"
              label="Active Events"
              value={String(data.summary.activeEvents)}
            />
            {isPro ? (
              <StatCard
                icon={<UserCheck className="h-5 w-5" />}
                iconBg="bg-orange-100 dark:bg-orange-900/30 text-orange-600"
                label="Check-in Rate"
                value={`${data.summary.checkInRate}%`}
                sub="Real-time"
              />
            ) : (
              <LockedCard label="Check-in Rate" plan="PRO" />
            )}
          </div>

          {/* Middle Section */}
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Active Events */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Active Events</CardTitle>
                  <Link href="/organiser/events" className="flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600">
                    View All <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {data.activeEvents.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No active events yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800 text-left text-xs text-gray-500 dark:text-gray-400">
                          <th className="pb-2 font-medium">Event</th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium text-right">Revenue</th>
                          <th className="pb-2 font-medium text-right">Sales</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.activeEvents.map((event) => {
                          const badge = statusBadge[event.status] || { label: event.status, color: 'bg-gray-100 text-gray-600' };
                          return (
                            <tr key={event.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                              <td className="py-3">
                                <Link href={`/organiser/events/${event.id}`} className="flex items-center gap-3">
                                  {event.imageUrl ? (
                                    <img src={event.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                                  ) : (
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30 text-sm font-bold text-orange-600">
                                      {event.title[0]}
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-gray-100">{event.title}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                      {new Date(event.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} &middot; {event.venue}
                                    </p>
                                  </div>
                                </Link>
                              </td>
                              <td className="py-3">
                                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge.color)}>{badge.label}</span>
                              </td>
                              <td className="py-3 text-right font-medium text-gray-900 dark:text-gray-100">₹{event.revenue.toLocaleString('en-IN')}</td>
                              <td className="py-3 text-right text-gray-600 dark:text-gray-300">
                                {event.ticketsSold.toLocaleString()}/{event.totalCapacity.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                {data.recentOrders.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No orders yet</p>
                ) : (
                  <div className="space-y-4">
                    {data.recentOrders.slice(0, 2).map((order) => (
                      <div key={order.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-xs font-bold text-orange-600">
                            {order.customerInitial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{order.customerName}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{order.eventTitle} &middot; {order.ticketCount} ticket{order.ticketCount > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-green-600 whitespace-nowrap">+₹{order.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    {data.recentOrders.length > 2 && (
                      <Link href="/organiser/orders" className="flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-medium text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                        View All Orders <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Subscription Usage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-orange-500" /> Plan Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <UsageBar label="Events this month" used={data.subscription.eventsUsed} max={data.subscription.eventsMax} />
                <UsageBar label="Staff accounts" used={data.subscription.staffUsed} max={data.subscription.staffMax} />
                <div className="flex items-center justify-between rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Commission rate</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-orange-600">{data.subscription.commission}%</span>
                    <span className="ml-1.5 rounded-full bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">
                      {data.subscription.commissionSource === 'custom' ? 'Custom' : 'Plan'}
                    </span>
                    {data.subscription.commissionSource === 'custom' && (
                      <p className="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                        Plan default: {data.subscription.planCommission}%
                      </p>
                    )}
                  </div>
                </div>
                {data.subscription.expiresAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                    Plan expires: {new Date(data.subscription.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Revenue This Month — PRO+ */}
            {isPro ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-blue-500" /> Monthly Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">₹{data.summary.revenueThisMonth.toLocaleString('en-IN')}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This month</p>
                    {data.summary.revenueLastMonth > 0 && (
                      <div className="mt-3 flex items-center justify-center gap-1">
                        {data.summary.revenueThisMonth >= data.summary.revenueLastMonth ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className={cn('text-sm font-medium', data.summary.revenueThisMonth >= data.summary.revenueLastMonth ? 'text-green-600' : 'text-red-600')}>
                          {data.summary.revenueLastMonth > 0
                            ? `${Math.round(((data.summary.revenueThisMonth - data.summary.revenueLastMonth) / data.summary.revenueLastMonth) * 100)}%`
                            : 'New'
                          } vs last month
                        </span>
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">Last month: ₹{data.summary.revenueLastMonth.toLocaleString('en-IN')}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <LockedWidget title="Monthly Revenue" plan="PRO" icon={<BarChart3 className="h-5 w-5 text-blue-500" />} />
            )}

            {/* Top Selling — ADVANCE+ */}
            {isAdvance ? (
              <Card>
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
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300">{i + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{e.title}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{e.ticketsSold} tickets</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">₹{e.revenue.toLocaleString('en-IN')}</span>
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
        </>
      )}
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, sub }: { icon: React.ReactNode; iconBg: string; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', iconBg)}>{icon}</div>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function LockedCard({ label, plan }: { label: string; plan: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600">
          <UserCheck className="h-5 w-5" />
        </div>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-300 dark:text-gray-600 blur-[6px] select-none">78.5%</p>
      </CardContent>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px]">
        <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        <p className="mt-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">{plan}+ Plan</p>
        <Link href="/organiser/subscriptions">
          <Button size="sm" className="mt-2 h-7 text-[11px] bg-linear-to-r from-[#ff4a1f] via-[#ff5413] to-[#ff6800] text-white">Upgrade</Button>
        </Link>
      </div>
    </Card>
  );
}

function LockedWidget({ title, plan, icon }: { title: string; plan: string; icon: React.ReactNode }) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="blur-[6px] select-none pointer-events-none">
          {title === 'Monthly Revenue' ? (
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">₹24,500</p>
              <p className="mt-1 text-sm text-gray-500">This month</p>
              <div className="mt-3 flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">+12% vs last month</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">Last month: ₹21,875</p>
            </div>
          ) : (
            <div className="space-y-3">
              {['Summer Festival', 'Tech Conference', 'Comedy Night'].map((name, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
                      <p className="text-xs text-gray-400">{(50 - i * 12)} tickets</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">₹{(15000 - i * 4000).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 dark:bg-gray-900/40">
        <div className="flex flex-col items-center rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-4 shadow-lg">
          <Lock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">{plan}+ Feature</p>
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Upgrade to unlock {title.toLowerCase()}</p>
          <Link href="/organiser/subscriptions">
            <Button size="sm" className="mt-3 bg-linear-to-r from-[#ff4a1f] via-[#ff5413] to-[#ff6800] text-white">Upgrade to {plan}</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(Math.round((used / max) * 100), 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-300">{label}</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">{used}/{max >= 999 ? '∞' : max}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn('h-2 rounded-full transition-all', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-orange-500')}
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
    <div className="mb-6 rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Complete Your Profile</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Complete the steps below. Once done, our admin team will review and approve your account so you can start creating events.
          </p>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-orange-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{completedCount}/{required.length}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {checks.map((check) => (
              <div
                key={check.label}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm',
                  check.done
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : check.optional
                      ? 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
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
          <Button className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white whitespace-nowrap">
            Go to Profile
          </Button>
        </Link>
      </div>
    </div>
  );
}
