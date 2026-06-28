'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Users, Calendar, ShoppingCart, IndianRupee, TrendingUp,
  ShieldCheck, AlertTriangle, ArrowRight, Wallet, Clock,
  BarChart3, Ticket,
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalCustomers: number;
  totalOrganisers: number;
  pendingOrganisers: number;
  totalEvents: number;
  pendingEvents: number;
  publishedEvents: number;
  totalOrders: number;
  totalRevenue: number;
  totalPlatformFee: number;
  pendingSettlements: number;
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    eventTitle: string;
    amount: number;
    platformFee: number;
    createdAt: string;
  }[];
  recentEvents: {
    id: string;
    title: string;
    slug: string;
    startDate: string;
    city: string;
    organiser: string;
    ticketsSold: number;
    totalCapacity: number;
  }[];
}

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get('/admin/dashboard')
      .then((res) => setStats(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const pendingCount = stats.pendingOrganisers + stats.pendingEvents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Platform overview and quick actions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {pendingCount > 0 && (
            <Link href="/admin/approvals">
              <Button size="sm">
                <AlertTriangle className="mr-1.5 h-4 w-4" />
                Review Approvals ({pendingCount})
              </Button>
            </Link>
          )}
          {stats.pendingSettlements > 0 && (
            <Link href="/admin/settlements">
              <Button size="sm" variant="outline">
                <Wallet className="mr-1.5 h-4 w-4" />
                Settlements ({stats.pendingSettlements})
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Revenue Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
              <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
                <IndianRupee className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(stats.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-900/10">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Platform Earnings</p>
              <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2">
                <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-orange-700 dark:text-orange-400">{formatCurrency(stats.totalPlatformFee)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2">
                <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalOrders}</p>
          </CardContent>
        </Card>
        <Card className={stats.pendingSettlements > 0 ? 'border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10' : ''}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Settlements</p>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2">
                <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendingSettlements}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users & Events Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="mx-auto h-5 w-5 text-gray-400 dark:text-gray-500 mb-1" />
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.totalUsers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="mx-auto h-5 w-5 text-blue-400 mb-1" />
            <p className="text-xl font-bold text-blue-600">{stats.totalCustomers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="mx-auto h-5 w-5 text-purple-400 mb-1" />
            <p className="text-xl font-bold text-purple-600">{stats.totalOrganisers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Organisers</p>
          </CardContent>
        </Card>
        <Card className={stats.pendingOrganisers > 0 ? 'border-amber-200 dark:border-amber-800/40' : ''}>
          <CardContent className="p-4 text-center">
            <ShieldCheck className="mx-auto h-5 w-5 text-amber-400 mb-1" />
            <p className="text-xl font-bold text-amber-600">{stats.pendingOrganisers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending Org</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="mx-auto h-5 w-5 text-green-400 mb-1" />
            <p className="text-xl font-bold text-green-600">{stats.publishedEvents}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Live Events</p>
          </CardContent>
        </Card>
        <Card className={stats.pendingEvents > 0 ? 'border-amber-200 dark:border-amber-800/40' : ''}>
          <CardContent className="p-4 text-center">
            <Clock className="mx-auto h-5 w-5 text-amber-400 mb-1" />
            <p className="text-xl font-bold text-amber-600">{stats.pendingEvents}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending Events</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders & Live Events */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4 text-orange-500" />
                Recent Orders
              </CardTitle>
              <Link href="/admin/orders" className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{order.customerName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{order.eventTitle}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(order.amount)}</p>
                      <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Events */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-orange-500" />
                Live Events
              </CardTitle>
              <Link href="/admin/events" className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-0.5">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentEvents.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">No live events</p>
            ) : (
              <div className="space-y-3">
                {stats.recentEvents.map((event) => {
                  const pct = event.totalCapacity > 0 ? Math.round((event.ticketsSold / event.totalCapacity) * 100) : 0;
                  return (
                    <div key={event.id} className="rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{event.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{event.organiser} &middot; {event.city}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(event.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-orange-500' : 'bg-gray-400')}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 shrink-0">
                          {event.ticketsSold}/{event.totalCapacity} ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: '/admin/users', label: 'Manage Users', icon: Users },
          { href: '/admin/events', label: 'Manage Events', icon: Calendar },
          { href: '/admin/orders', label: 'View Orders', icon: ShoppingCart },
          { href: '/admin/settlements', label: 'Settlements', icon: Wallet },
        ].map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="group cursor-pointer hover:border-orange-200 dark:hover:border-orange-800/40 transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-colors">
                    <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400 group-hover:text-orange-600 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-orange-600 transition-colors">{link.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
