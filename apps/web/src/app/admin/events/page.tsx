'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

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
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  PENDING_APPROVAL: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  PUBLISHED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  COMPLETED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
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
          {['', 'DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED'].map((s) => (
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
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
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
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusColors[event.status])}>
                      {statusLabels[event.status] || event.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {event.status === 'PENDING_APPROVAL' && (
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleReview(event.id, 'APPROVED')} disabled={actionLoading === event.id}>
                          Publish
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleReview(event.id, 'REJECTED')} disabled={actionLoading === event.id}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
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
