'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { IndianRupee, TrendingUp, Percent, Wallet, Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface SettlementSummary {
  totalRevenue: number;
  totalPlatformFee: number;
  totalCommission: number;
  totalPayout: number;
  totalSettled: number;
  pendingSettlement: number;
}

interface EventBreakdown {
  eventId: string;
  title: string;
  revenue: number;
  platformFee: number;
  commission: number;
  payout: number;
  settled: number;
  available: number;
}

interface Settlement {
  id: string;
  createdAt: string;
  amount: number;
  netPayout: number;
  status: 'PENDING' | 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  transactionRef: string | null;
  notes: string | null;
  rejectionReason: string | null;
  event: { id: string; title: string; slug: string };
}

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  REQUESTED: { label: 'Requested', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  PROCESSING: { label: 'Processing', className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
};

export default function SettlementsPage() {
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [events, setEvents] = useState<EventBreakdown[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingEventId, setRequestingEventId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, settlementsRes] = await Promise.all([
        apiClient.get('/settlements/summary'),
        apiClient.get('/settlements/my'),
      ]);
      const summaryData = summaryRes.data.data;
      setSummary(summaryData);
      setEvents(summaryData.events || []);
      setSettlements(settlementsRes.data.data || []);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load settlement data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequestSettlement = async (eventId: string) => {
    setRequestingEventId(eventId);
    setMessage(null);
    try {
      await apiClient.post(`/settlements/request/${eventId}`);
      setMessage({ type: 'success', text: 'Settlement request submitted successfully.' });
      await fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage({
        type: 'error',
        text: error.response?.data?.error?.message || 'Failed to request settlement.',
      });
    } finally {
      setRequestingEventId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-3 h-8 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Revenue', value: summary?.totalRevenue ?? 0, icon: IndianRupee, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Platform Fees', value: summary?.totalPlatformFee ?? 0, icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Commission', value: summary?.totalCommission ?? 0, icon: Percent, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Available for Settlement', value: summary?.pendingSettlement ?? 0, icon: Wallet, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settlements</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track your earnings and request payouts for your events.
        </p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm',
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400',
          )}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <div className={cn('rounded-lg p-2', stat.bg)}>
                    <Icon className={cn('h-4 w-4', stat.color)} />
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(stat.value)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Event-wise Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event-wise Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No events with revenue found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Event</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Orders</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Fees</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Net Payout</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Settled</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Available</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {events.map((event) => (
                    <tr key={event.eventId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate">
                        {event.title}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                        --
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                        {formatCurrency(Number(event.revenue))}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-600 dark:text-gray-300">
                        {formatCurrency(Number(event.platformFee) + Number(event.commission))}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(Number(event.payout))}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-green-600 dark:text-green-400">
                        {formatCurrency(Number(event.settled))}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-medium text-orange-600 dark:text-orange-400">
                        {formatCurrency(Number(event.available))}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {Number(event.available) > 0 ? (
                          <Button
                            size="sm"
                            onClick={() => handleRequestSettlement(event.eventId)}
                            disabled={requestingEventId === event.eventId}
                          >
                            {requestingEventId === event.eventId ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Requesting...
                              </>
                            ) : (
                              'Request Settlement'
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlement History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Settlement History</CardTitle>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No settlement history yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Event</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Transaction Ref</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {settlements.map((settlement) => {
                    const status = statusConfig[settlement.status] || statusConfig.PENDING;
                    return (
                      <tr key={settlement.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {new Date(settlement.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100 max-w-[180px] truncate">
                          {settlement.event?.title || '--'}
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(Number(settlement.netPayout))}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              status.className,
                            )}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {settlement.transactionRef || '--'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-[200px]">
                          {settlement.status === 'REJECTED' && settlement.rejectionReason ? (
                            <span className="text-red-600 dark:text-red-400">{settlement.rejectionReason}</span>
                          ) : (
                            <span className="truncate">{settlement.notes || '--'}</span>
                          )}
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
    </div>
  );
}
