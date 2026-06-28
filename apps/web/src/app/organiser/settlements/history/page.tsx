'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Clock, ArrowLeft } from 'lucide-react';

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

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  REQUESTED: { label: 'Requested', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  PROCESSING: { label: 'Processing', className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
};

const formatCurrency = (amount: number) =>
  `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PER_PAGE = 10;

export default function SettlementHistoryPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    apiClient.get('/settlements/my')
      .then((res) => setSettlements(res.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = statusFilter
    ? settlements.filter((s) => s.status === statusFilter)
    : settlements;

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [statusFilter]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/organiser/settlements" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settlement History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track all your settlement requests and payouts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'REQUESTED', 'PROCESSING', 'COMPLETED', 'REJECTED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors', statusFilter === s ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700')}
          >
            {s ? statusConfig[s]?.label || s : 'All'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{settlements.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-green-600">{settlements.filter((s) => s.status === 'COMPLETED').length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-blue-600">{settlements.filter((s) => ['REQUESTED', 'PROCESSING'].includes(s.status)).length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(settlements.filter((s) => s.status === 'COMPLETED').reduce((sum, s) => sum + Number(s.netPayout), 0))}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Settled</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {statusFilter ? `No ${statusConfig[statusFilter]?.label.toLowerCase()} settlements` : 'No settlement history yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Event</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Amount</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Transaction Ref</th>
                      <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {paginated.map((s) => {
                      const status = statusConfig[s.status] || statusConfig.PENDING;
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {new Date(s.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-[180px] truncate">
                            {s.event?.title || '--'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(Number(s.netPayout))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', status.className)}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                            {s.transactionRef || '--'}
                          </td>
                          <td className="px-4 py-3 text-sm max-w-[200px]">
                            {s.status === 'REJECTED' && s.rejectionReason ? (
                              <span className="text-red-600 dark:text-red-400">{s.rejectionReason}</span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400 truncate">{s.notes || '--'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Page {page} of {totalPages} ({filtered.length} records)
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
