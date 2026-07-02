'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, Eye, Calendar, Globe, Monitor, User } from 'lucide-react';

interface TermsAcceptance {
  id: string;
  userId: string;
  contentPageId: string;
  contentVersion: string;
  ipAddress: string | null;
  userAgent: string | null;
  acceptedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
  };
  contentPage: {
    id: string;
    title: string;
    audience: string;
    slug: string;
    updatedAt: string;
  } | null;
}

const roleColors: Record<string, string> = {
  CUSTOMER: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  ORGANISER: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  ADMIN: 'bg-gray-800 text-white',
};

const audienceColors: Record<string, string> = {
  customer: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  organiser: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
};

export default function TermsAcceptancesPage() {
  const [acceptances, setAcceptances] = useState<TermsAcceptance[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [audienceFilter, setAudienceFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<TermsAcceptance | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (audienceFilter) params.set('audience', audienceFilter);

      const res = await apiClient.get(`/admin/terms-acceptances?${params.toString()}`);
      setAcceptances(res.data.data.data);
      setTotal(res.data.data.meta.total);
      setTotalPages(res.data.data.meta.totalPages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, audienceFilter]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', { dateStyle: 'medium' });

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const isOutdated = (record: TermsAcceptance) => {
    if (!record.contentPage) return false;
    return new Date(record.contentVersion).getTime() < new Date(record.contentPage.updatedAt).getTime();
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Terms & Conditions Acceptances ({total})</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Track which users accepted which version of the Terms of Service</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'customer', 'organiser'].map((a) => (
          <button
            key={a}
            onClick={() => { setAudienceFilter(a); setPage(1); }}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              audienceFilter === a
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
            )}
          >
            {a === '' ? 'All' : a === 'customer' ? 'Customers' : 'Organisers'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : acceptances.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No terms acceptances found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-left text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Terms Version</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Accepted At</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {acceptances.map((record) => {
                const outdated = isOutdated(record);
                return (
                  <tr key={record.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {record.user.firstName} {record.user.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{record.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', roleColors[record.user.role])}>
                        {record.user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                      {formatDate(record.contentVersion)}
                    </td>
                    <td className="px-4 py-3">
                      {record.contentPage && (
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', audienceColors[record.contentPage.audience] || 'bg-gray-100 text-gray-600')}>
                          {record.contentPage.audience}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {outdated ? (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          Outdated
                        </span>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">
                      {formatDateTime(record.acceptedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSelectedRecord(record)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Details
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="px-4 text-sm text-gray-600 dark:text-gray-300">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Acceptance Details</h2>
              <button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* User Info */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">User</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedRecord.user.firstName} {selectedRecord.user.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedRecord.user.email}</p>
                <div className="mt-2 flex gap-2">
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', roleColors[selectedRecord.user.role])}>
                    {selectedRecord.user.role}
                  </span>
                </div>
              </div>

              {/* Terms Info */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Terms Version</span>
                </div>
                {selectedRecord.contentPage && (
                  <>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedRecord.contentPage.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Audience: <span className="font-medium capitalize">{selectedRecord.contentPage.audience}</span>
                    </p>
                  </>
                )}
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Version accepted: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTime(selectedRecord.contentVersion)}</span>
                  </p>
                  {selectedRecord.contentPage && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Current version: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTime(selectedRecord.contentPage.updatedAt)}</span>
                    </p>
                  )}
                  {isOutdated(selectedRecord) && (
                    <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      User accepted an older version of the terms
                    </p>
                  )}
                </div>
              </div>

              {/* Acceptance Info */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Acceptance Info</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Accepted at: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDateTime(selectedRecord.acceptedAt)}</span>
                </p>
                {selectedRecord.ipAddress && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Globe className="h-3.5 w-3.5 text-gray-400" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      IP: <span className="font-mono text-gray-700 dark:text-gray-300">{selectedRecord.ipAddress}</span>
                    </p>
                  </div>
                )}
                {selectedRecord.userAgent && (
                  <div className="flex items-start gap-1.5 mt-1.5">
                    <Monitor className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                      {selectedRecord.userAgent}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
