'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Gift, CheckCircle, Clock, XCircle, AlertCircle, Coins, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReferralItem {
  id: string;
  referralCode: string;
  status: string;
  grossTicketSales: number | null;
  rewardPoints: number | null;
  referralNumber: number | null;
  qualifiedAt: string | null;
  rewardedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  referrer: { id: string; firstName: string; lastName: string; orgName: string | null; email: string };
  referred: { id: string; firstName: string; lastName: string; orgName: string | null; email: string };
  qualifyingEvent: { id: string; title: string } | null;
}

interface Stats {
  total: number; pending: number; qualified: number; rewarded: number; rejected: number; totalPointsIssued: number;
}

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [page, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [refRes, statsRes] = await Promise.all([
        apiClient.get('/referrals/admin/all', { params: { page, limit: 20, ...(statusFilter && { status: statusFilter }) } }),
        apiClient.get('/referrals/admin/stats'),
      ]);
      setReferrals(refRes.data.data.referrals);
      setTotalPages(refRes.data.data.totalPages);
      setStats(statsRes.data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await apiClient.patch(`/referrals/admin/${id}`, { status: 'REWARDED' });
      setMessage({ type: 'success', text: 'Referral rewarded successfully' });
      fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Failed to reward referral' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal);
    try {
      await apiClient.patch(`/referrals/admin/${rejectModal}`, { status: 'REJECTED', rejectionReason: rejectReason });
      setMessage({ type: 'success', text: 'Referral rejected' });
      setRejectModal(null);
      setRejectReason('');
      fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Failed to reject referral' });
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { text: string; cls: string; icon: typeof Clock }> = {
      PENDING: { text: 'Pending', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
      QUALIFIED: { text: 'Qualified', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: AlertCircle },
      REWARDED: { text: 'Rewarded', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
      REJECTED: { text: 'Rejected', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    };
    const s = map[status] || { text: status, cls: 'bg-gray-100 text-gray-700', icon: Clock };
    const Icon = s.icon;
    return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}><Icon className="h-3.5 w-3.5" />{s.text}</span>;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Referral Management</h1>

      {message && (
        <div className={`rounded-xl p-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-gray-500">Total</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-yellow-600">{stats.pending}</p><p className="text-xs text-gray-500">Pending</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-blue-600">{stats.qualified}</p><p className="text-xs text-gray-500">Qualified</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-green-600">{stats.rewarded}</p><p className="text-xs text-gray-500">Rewarded</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-red-600">{stats.rejected}</p><p className="text-xs text-gray-500">Rejected</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold text-orange-600">{stats.totalPointsIssued.toLocaleString('en-IN')}</p><p className="text-xs text-gray-500">Points Issued</p></CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['', 'PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Referrals Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : referrals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No referrals found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Referrer</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Referred</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Event</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Gross Sales</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Points</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                    <th className="text-center py-3 px-4 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(r => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{r.referrer.orgName || `${r.referrer.firstName} ${r.referrer.lastName}`}</p>
                        <p className="text-xs text-gray-500">{r.referrer.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{r.referred.orgName || `${r.referred.firstName} ${r.referred.lastName}`}</p>
                        <p className="text-xs text-gray-500">{r.referred.email}</p>
                      </td>
                      <td className="py-3 px-4">{statusBadge(r.status)}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{r.qualifyingEvent?.title || '—'}</td>
                      <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                        {r.grossTicketSales ? `₹${Number(r.grossTicketSales).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-orange-600">{r.rewardPoints || '—'}</td>
                      <td className="py-3 px-4 text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td>
                      <td className="py-3 px-4 text-center">
                        {r.status === 'QUALIFIED' && (
                          <div className="flex gap-1 justify-center">
                            <Button
                              onClick={() => handleApprove(r.id)}
                              disabled={actionLoading === r.id}
                              className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-1 h-7"
                            >
                              Reward
                            </Button>
                            <Button
                              onClick={() => setRejectModal(r.id)}
                              disabled={actionLoading === r.id}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 h-7"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {r.status === 'PENDING' && (
                          <Button
                            onClick={() => setRejectModal(r.id)}
                            disabled={actionLoading === r.id}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 h-7"
                          >
                            Reject
                          </Button>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">{page} / {totalPages}</span>
          <Button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Reject Referral</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm outline-none"
              rows={3}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <Button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                Cancel
              </Button>
              <Button onClick={handleReject} disabled={!rejectReason.trim()} className="bg-red-500 hover:bg-red-600 text-white">
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
