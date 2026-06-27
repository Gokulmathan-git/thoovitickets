'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Settlement {
  id: string;
  status: string;
  amount: number;
  platformFee: number;
  netPayout: number;
  transactionRef: string | null;
  rejectionReason: string | null;
  createdAt: string;
  processedAt: string | null;
  event: {
    id: string;
    title: string;
  };
  organiser: {
    id: string;
    firstName: string;
    lastName: string;
    orgName: string | null;
  };
}

const settlementStatusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  REQUESTED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  PROCESSING: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  COMPLETED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const STATUS_OPTIONS = ['All', 'PENDING', 'REQUESTED', 'PROCESSING', 'COMPLETED', 'REJECTED'] as const;

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approveForm, setApproveForm] = useState<{ id: string; transactionRef: string } | null>(null);
  const [rejectForm, setRejectForm] = useState<{ id: string; rejectionReason: string } | null>(null);

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      const res = await apiClient.get('/settlements/admin', { params });
      const data = res.data.data;
      setSettlements(Array.isArray(data) ? data : data.settlements || data.items || []);
    } catch {
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const handleApprove = async (id: string, transactionRef: string) => {
    if (!transactionRef.trim()) {
      alert('Please enter a transaction reference number');
      return;
    }
    setActionLoading(id);
    try {
      await apiClient.post(`/settlements/admin/${id}/process`, {
        action: 'approve',
        transactionRef,
      });
      setApproveForm(null);
      fetchSettlements();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to approve settlement');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, rejectionReason: string) => {
    if (!rejectionReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }
    setActionLoading(id);
    try {
      await apiClient.post(`/settlements/admin/${id}/process`, {
        action: 'reject',
        rejectionReason,
      });
      setRejectForm(null);
      fetchSettlements();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to reject settlement');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Settlements</h1>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
            {statusFilter !== 'All' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter('All')}
              >
                Clear filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : settlements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">No settlements found</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Try adjusting your filter</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Organiser</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Event</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400 text-right hidden sm:table-cell">Net Payout</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((settlement) => (
                  <SettlementRow
                    key={settlement.id}
                    settlement={settlement}
                    actionLoading={actionLoading}
                    approveForm={approveForm}
                    rejectForm={rejectForm}
                    onApproveClick={(id) => {
                      setRejectForm(null);
                      setApproveForm({ id, transactionRef: '' });
                    }}
                    onRejectClick={(id) => {
                      setApproveForm(null);
                      setRejectForm({ id, rejectionReason: '' });
                    }}
                    onApproveSubmit={handleApprove}
                    onRejectSubmit={handleReject}
                    onApproveFormChange={(transactionRef) =>
                      setApproveForm((f) => f ? { ...f, transactionRef } : null)
                    }
                    onRejectFormChange={(rejectionReason) =>
                      setRejectForm((f) => f ? { ...f, rejectionReason } : null)
                    }
                    onCancel={() => { setApproveForm(null); setRejectForm(null); }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function SettlementRow({
  settlement,
  actionLoading,
  approveForm,
  rejectForm,
  onApproveClick,
  onRejectClick,
  onApproveSubmit,
  onRejectSubmit,
  onApproveFormChange,
  onRejectFormChange,
  onCancel,
}: {
  settlement: Settlement;
  actionLoading: string | null;
  approveForm: { id: string; transactionRef: string } | null;
  rejectForm: { id: string; rejectionReason: string } | null;
  onApproveClick: (id: string) => void;
  onRejectClick: (id: string) => void;
  onApproveSubmit: (id: string, transactionRef: string) => void;
  onRejectSubmit: (id: string, rejectionReason: string) => void;
  onApproveFormChange: (value: string) => void;
  onRejectFormChange: (value: string) => void;
  onCancel: () => void;
}) {
  const isApproving = approveForm?.id === settlement.id;
  const isRejecting = rejectForm?.id === settlement.id;
  const isLoading = actionLoading === settlement.id;

  return (
    <>
      <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
          {new Date(settlement.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {settlement.organiser.orgName || `${settlement.organiser.firstName} ${settlement.organiser.lastName}`}
          </p>
        </td>
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 hidden md:table-cell max-w-[200px] truncate">
          {settlement.event.title}
        </td>
        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
          ₹{Number(settlement.amount).toLocaleString('en-IN')}
        </td>
        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 hidden sm:table-cell">
          ₹{Number(settlement.netPayout).toLocaleString('en-IN')}
        </td>
        <td className="px-4 py-3">
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', settlementStatusColors[settlement.status])}>
            {settlement.status}
          </span>
        </td>
        <td className="px-4 py-3">
          {settlement.status === 'REQUESTED' && !isApproving && !isRejecting && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onApproveClick(settlement.id)}
                disabled={isLoading}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onRejectClick(settlement.id)}
                disabled={isLoading}
              >
                Reject
              </Button>
            </div>
          )}
          {settlement.status === 'COMPLETED' && settlement.transactionRef && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Ref: {settlement.transactionRef}
            </span>
          )}
          {settlement.status === 'REJECTED' && settlement.rejectionReason && (
            <span className="text-xs text-red-500 dark:text-red-400" title={settlement.rejectionReason}>
              {settlement.rejectionReason.length > 30
                ? settlement.rejectionReason.slice(0, 30) + '...'
                : settlement.rejectionReason}
            </span>
          )}
        </td>
      </tr>

      {/* Approve inline form */}
      {isApproving && (
        <tr>
          <td colSpan={7} className="bg-green-50 dark:bg-green-900/10 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Approve settlement:</span>
              </div>
              <input
                type="text"
                placeholder="Transaction reference number"
                value={approveForm.transactionRef}
                onChange={(e) => onApproveFormChange(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onApproveSubmit(settlement.id, approveForm.transactionRef)}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Reject inline form */}
      {isRejecting && (
        <tr>
          <td colSpan={7} className="bg-red-50 dark:bg-red-900/10 px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span className="text-sm font-medium text-red-700 dark:text-red-400">Reject settlement:</span>
              </div>
              <input
                type="text"
                placeholder="Reason for rejection"
                value={rejectForm.rejectionReason}
                onChange={(e) => onRejectFormChange(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onRejectSubmit(settlement.id, rejectForm.rejectionReason)}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancel} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
