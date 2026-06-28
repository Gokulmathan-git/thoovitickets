'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Search, Pencil, X, ChevronDown, ChevronUp, BarChart3, Loader2, Eye } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  slug: string;
  status: string;
  startDate: string;
  city: string;
  venue: string;
  category: { name: string };
  organiser: { firstName: string; lastName: string; orgName: string | null; email: string };
  ticketTypes: { price: number; totalQty: number; soldQty: number }[];
  commissionPercent?: number | null;
}

interface EventMetrics {
  totalPurchased: number;
  attended: number;
  notAttended: number;
  cancelledTickets: number;
  attendanceRate: number;
  totalOrders: number;
  totalRevenue: number;
  organiserPayout: number;
  ticketTypes: { name: string; totalQty: number; soldQty: number; available: number; price: number }[];
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  PENDING_APPROVAL: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  PUBLISHED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  COMPLETED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  POSTPONED: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  POSTPONED: 'Postponed',
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [commissionValue, setCommissionValue] = useState('');
  const [commissionLoading, setCommissionLoading] = useState(false);
  const commissionInputRef = useRef<HTMLInputElement>(null);
  const [expandedMetrics, setExpandedMetrics] = useState<string | null>(null);
  const [metricsData, setMetricsData] = useState<Record<string, EventMetrics>>({});
  const [metricsLoading, setMetricsLoading] = useState<string | null>(null);

  const toggleMetrics = useCallback(async (eventId: string) => {
    if (expandedMetrics === eventId) {
      setExpandedMetrics(null);
      return;
    }
    setExpandedMetrics(eventId);
    if (metricsData[eventId]) return;
    setMetricsLoading(eventId);
    try {
      const res = await apiClient.get(`/analytics/event/${eventId}`);
      setMetricsData((prev) => ({ ...prev, [eventId]: res.data.data }));
    } catch {
      setExpandedMetrics(null);
    } finally {
      setMetricsLoading(null);
    }
  }, [expandedMetrics, metricsData]);

  const openCommissionEditor = async (eventId: string) => {
    setEditingCommission(eventId);
    setCommissionLoading(true);
    try {
      const res = await apiClient.get(`/admin/events/${eventId}/commission`);
      const current = res.data.data?.commissionPercent;
      setCommissionValue(current != null ? String(current) : '');
    } catch {
      setCommissionValue('');
    } finally {
      setCommissionLoading(false);
      setTimeout(() => commissionInputRef.current?.focus(), 50);
    }
  };

  const saveCommission = async (eventId: string) => {
    setCommissionLoading(true);
    try {
      const value = commissionValue.trim() === '' ? null : parseFloat(commissionValue);
      await apiClient.patch(`/admin/events/${eventId}/commission`, { commissionPercent: value });
      setEditingCommission(null);
      fetchEvents();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to update commission');
    } finally {
      setCommissionLoading(false);
    }
  };

  const resetCommission = async (eventId: string) => {
    setCommissionLoading(true);
    try {
      await apiClient.patch(`/admin/events/${eventId}/commission`, { commissionPercent: null });
      setEditingCommission(null);
      fetchEvents();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to reset commission');
    } finally {
      setCommissionLoading(false);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await apiClient.get(`/admin/events?${params.toString()}`);
      setEvents(res.data.data.events);
      setTotal(res.data.data.total);
      setTotalPages(res.data.data.totalPages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleReview = async (eventId: string, action: 'APPROVED' | 'REJECTED') => {
    setActionLoading(eventId);
    try {
      await apiClient.post(`/admin/events/${eventId}/review`, { action });
      fetchEvents();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">All Events ({total})</h1>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-full sm:w-64" />
          </div>
          <Button type="submit" size="sm">Search</Button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {['', 'DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'POSTPONED', 'REJECTED'].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={cn('rounded-full px-3 py-1 text-xs font-medium', statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700')}>
              {s ? statusLabels[s] : 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />)}</div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No events found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Organiser</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Sold</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Commission</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const totalSold = event.ticketTypes.reduce((sum, tt) => sum + tt.soldQty, 0);
                const totalQty = event.ticketTypes.reduce((sum, tt) => sum + tt.totalQty, 0);
                const inlineRevenue = event.ticketTypes.reduce((sum, tt) => sum + tt.price * tt.soldQty, 0);
                const isExpanded = expandedMetrics === event.id;
                const metrics = metricsData[event.id];
                const isLoadingMetrics = metricsLoading === event.id;

                return (
                <React.Fragment key={event.id}>
                <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{event.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{event.venue}, {event.city}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700 dark:text-gray-200">{event.organiser.orgName || `${event.organiser.firstName} ${event.organiser.lastName}`}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{event.organiser.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{event.category.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                    {new Date(event.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{totalSold}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">/{totalQty}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {inlineRevenue > 0 ? `Rs.${inlineRevenue.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[event.status])}>
                      {statusLabels[event.status] || event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingCommission === event.id ? (
                      <div className="flex flex-col gap-1.5 min-w-35">
                        <div className="flex items-center gap-1">
                          <Input
                            ref={commissionInputRef}
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="e.g. 1.5"
                            value={commissionValue}
                            onChange={(e) => setCommissionValue(e.target.value)}
                            className="h-7 w-20 text-xs px-2"
                            disabled={commissionLoading}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveCommission(event.id); if (e.key === 'Escape') setEditingCommission(null); }}
                          />
                          <span className="text-xs text-gray-400">%</span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" className="h-6 px-2 text-xs" onClick={() => saveCommission(event.id)} disabled={commissionLoading}>
                            Set
                          </Button>
                          <Button size="sm" variant="secondary" className="h-6 px-2 text-xs" onClick={() => resetCommission(event.id)} disabled={commissionLoading}>
                            Reset to plan
                          </Button>
                          <button onClick={() => setEditingCommission(null)} className="ml-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {event.commissionPercent != null ? (
                          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                            {event.commissionPercent}% <span className="text-[10px] opacity-70">(event)</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">Plan default</span>
                        )}
                        <button
                          onClick={() => openCommissionEditor(event.id)}
                          className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          title="Edit commission"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Link href={`/admin/events/${event.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          <Eye className="h-3 w-3" /> View
                        </Button>
                      </Link>
                      {event.status === 'PENDING_APPROVAL' && (
                        <>
                          <Button size="sm" className="h-7 text-xs" onClick={() => handleReview(event.id, 'APPROVED')} disabled={actionLoading === event.id}>
                            Publish
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleReview(event.id, 'REJECTED')} disabled={actionLoading === event.id}>
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => toggleMetrics(event.id)}
                      >
                        {isLoadingMetrics ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <BarChart3 className="h-3 w-3" />
                        )}
                        Metrics
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td colSpan={9} className="px-4 py-4 bg-gray-50/50 dark:bg-gray-800/50">
                      {isLoadingMetrics ? (
                        <div className="flex items-center justify-center py-4 gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading metrics...
                        </div>
                      ) : metrics ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                              Purchased: {metrics.totalPurchased}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 dark:bg-green-900/20 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-300">
                              Attended: {metrics.attended}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                              Not Attended: {metrics.notAttended}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300">
                              Cancelled: {metrics.cancelledTickets}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                              Attendance Rate: {metrics.attendanceRate}%
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Orders:</span>{' '}
                              <span className="font-medium text-gray-900 dark:text-gray-100">{metrics.totalOrders}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Revenue:</span>{' '}
                              <span className="font-medium text-gray-900 dark:text-gray-100">Rs.{metrics.totalRevenue.toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Organiser Payout:</span>{' '}
                              <span className="font-medium text-gray-900 dark:text-gray-100">Rs.{metrics.organiserPayout.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          {metrics.ticketTypes.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ticket Breakdown</p>
                              <div className="grid gap-1">
                                {metrics.ticketTypes.map((tt) => (
                                  <div key={tt.name} className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                                    <span className="font-medium min-w-25">{tt.name}</span>
                                    <span>Rs.{tt.price.toLocaleString('en-IN')}</span>
                                    <span className="text-gray-400 dark:text-gray-500">|</span>
                                    <span>{tt.soldQty}/{tt.totalQty} sold</span>
                                    <span className="text-gray-400 dark:text-gray-500">|</span>
                                    <span className="text-green-600 dark:text-green-400">{tt.available} available</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )}
                </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="px-4 text-sm text-gray-600 dark:text-gray-300">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
