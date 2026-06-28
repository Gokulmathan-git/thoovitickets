'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowLeft, Users, Ticket, CheckCircle2, XCircle, Download, Send, RefreshCw } from 'lucide-react';

interface Attendee {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  ticketCode: string;
  qrDataUrl: string | null;
  status: string;
  checkedInAt: string | null;
  ticketTypeName: string;
}

const statusBadge: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  USED: { label: 'Checked In', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
};

export default function EventAttendeesPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAttendees = useCallback(async () => {
    try {
      const res = await apiClient.get(`/orders/organiser/event/${eventId}/attendees`);
      const data = res.data.data;
      setAttendees(data.attendees || []);
      setEventTitle(data.event?.title || '');
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { fetchAttendees(); }, [fetchAttendees]);

  const filtered = statusFilter ? attendees.filter((a) => a.status === statusFilter) : attendees;
  const stats = {
    total: attendees.length,
    checkedIn: attendees.filter((a) => a.status === 'USED').length,
    active: attendees.filter((a) => a.status === 'ACTIVE').length,
    cancelled: attendees.filter((a) => a.status === 'CANCELLED').length,
  };

  const handleExport = async () => {
    try {
      const res = await apiClient.get(`/orders/organiser/event/${eventId}/attendees/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${eventTitle || 'attendees'}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to export'); }
  };

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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/organiser/events/${eventId}`} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Attendees</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{eventTitle}</p>
          </div>
        </div>
        {attendees.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Ticket className="mx-auto h-5 w-5 text-orange-500 mb-1" />
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-green-500 mb-1" />
            <div className="text-2xl font-bold text-green-600">{stats.checkedIn}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Checked In</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Ticket className="mx-auto h-5 w-5 text-blue-500 mb-1" />
            <div className="text-2xl font-bold text-blue-600">{stats.active}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="mx-auto h-5 w-5 text-red-500 mb-1" />
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Cancelled</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'ACTIVE', 'USED', 'CANCELLED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('rounded-full px-3 py-1 text-xs font-medium transition-colors', statusFilter === s ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700')}>
            {s ? statusBadge[s]?.label || s : `All (${stats.total})`}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {statusFilter ? 'No attendees with this status' : 'No attendees yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden md:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <th className="px-4 py-3">Attendee</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Ticket Type</th>
                      <th className="px-4 py-3">Ticket Code</th>
                      <th className="px-4 py-3">QR</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filtered.map((a) => {
                      const badge = statusBadge[a.status] || statusBadge.ACTIVE;
                      return (
                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{a.attendeeName}</td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-gray-600 dark:text-gray-300">{a.attendeeEmail}</div>
                            {a.attendeePhone && <div className="text-xs text-gray-400">{a.attendeePhone}</div>}
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.ticketTypeName}</td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{a.ticketCode}</span>
                          </td>
                          <td className="px-4 py-3">
                            {a.qrDataUrl ? <img src={a.qrDataUrl} alt="QR" className="h-10 w-10 rounded" /> : <span className="text-xs text-gray-400">--</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge.color)}>{badge.label}</span>
                            {a.checkedInAt && <p className="text-[10px] text-gray-400 mt-0.5">{new Date(a.checkedInAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {filtered.map((a) => {
              const badge = statusBadge[a.status] || statusBadge.ACTIVE;
              return (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{a.attendeeName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{a.attendeeEmail}</p>
                      </div>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge.color)}>{badge.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                      <span>{a.ticketTypeName}</span>
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{a.ticketCode}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
