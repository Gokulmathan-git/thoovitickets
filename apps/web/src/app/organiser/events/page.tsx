'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Users, Pencil, CalendarDays, MapPin, Tag, Sparkles, Plus, Ticket, Eye } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  slug: string;
  status: string;
  startDate: string;
  endDate: string;
  city: string;
  venue: string;
  imageUrl: string | null;
  category: { name: string };
  ticketTypes: { price: number; soldQty: number; totalQty: number }[];
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', dot: 'bg-gray-400' },
  PENDING_APPROVAL: { label: 'Pending', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  APPROVED: { label: 'Approved', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  PUBLISHED: { label: 'Live', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  REJECTED: { label: 'Rejected', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  COMPLETED: { label: 'Completed', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
  POSTPONED: { label: 'Postponed', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
};

export default function OrganiserEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const url = filter ? `/events/my?status=${filter}` : '/events/my';
        const res = await apiClient.get(url);
        setEvents(res.data.data);
      } catch { /* handle error */ }
      finally { setLoading(false); }
    };
    fetchEvents();
  }, [filter]);

  const totalEvents = events.length;
  const liveCount = events.filter((e) => e.status === 'PUBLISHED').length;
  const totalSold = events.reduce((sum, e) => sum + e.ticketTypes.reduce((s, t) => s + (t.soldQty || 0), 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Events</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage and track all your events</p>
        </div>
        <Link href="/organiser/events/create">
          <Button className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20">
            <Plus className="mr-1.5 h-4 w-4" /> Create Event
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      {!loading && events.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-gray-800 p-3 text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{totalEvents}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Total Events</p>
          </div>
          <div className="rounded-xl border border-green-200/60 dark:border-green-800/40 bg-white dark:bg-gray-800 p-3 text-center">
            <p className="text-xl font-bold text-green-600">{liveCount}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Live Now</p>
          </div>
          <div className="rounded-xl border border-orange-200/60 dark:border-orange-800/40 bg-white dark:bg-gray-800 p-3 text-center">
            <p className="text-xl font-bold text-orange-600">{totalSold}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Tickets Sold</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['', 'DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'COMPLETED', 'REJECTED'].map((status) => {
          const config = status ? statusConfig[status] : null;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all',
                filter === status
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
              )}
            >
              {status === '' ? 'All' : config?.label || status}
            </button>
          );
        })}
      </div>

      {/* Event Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-gray-800 p-4">
              <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-gray-800 py-16 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-4 text-lg font-medium text-gray-500 dark:text-gray-400">
            {filter ? 'No events with this status' : 'No events yet'}
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Create your first event and start selling tickets</p>
          <Link href="/organiser/events/create">
            <Button className="mt-6 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
              <Sparkles className="mr-1.5 h-4 w-4" /> Create Your Event
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const config = statusConfig[event.status] || statusConfig.DRAFT;
            const totalTickets = event.ticketTypes.reduce((s, t) => s + (t.totalQty || 0), 0);
            const soldTickets = event.ticketTypes.reduce((s, t) => s + (t.soldQty || 0), 0);
            const sellPct = totalTickets > 0 ? Math.round((soldTickets / totalTickets) * 100) : 0;
            const minPrice = event.ticketTypes.length > 0 ? Math.min(...event.ticketTypes.map((t) => Number(t.price))) : 0;
            const isLive = event.status === 'PUBLISHED';
            const canEdit = ['DRAFT', 'REJECTED', 'PUBLISHED'].includes(event.status);
            const hasAttendees = ['PUBLISHED', 'COMPLETED'].includes(event.status);

            return (
              <div
                key={event.id}
                onClick={() => router.push(`/organiser/events/${event.id}`)}
                className="group flex flex-col sm:flex-row gap-4 rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white dark:bg-gray-800 p-4 transition-all hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-800/40 hover:-translate-y-0.5 cursor-pointer"
              >
                {/* Event Image */}
                <div className="h-32 sm:h-auto sm:w-32 shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                  {event.imageUrl ? (
                    <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
                      <CalendarDays className="h-8 w-8 text-orange-300 dark:text-orange-700" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{event.title}</h3>
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', config.color)}>
                      {isLive && <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', config.dot)} />}
                      {config.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {event.venue}, {event.city}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Tag className="h-3 w-3" /> {event.category.name}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Ticket Sales Progress */}
                  {totalTickets > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden max-w-[200px]">
                        <div
                          className={cn('h-full rounded-full transition-all', sellPct >= 80 ? 'bg-green-500' : sellPct >= 40 ? 'bg-orange-500' : 'bg-gray-400')}
                          style={{ width: `${sellPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        <Ticket className="inline h-3 w-3 mr-0.5" />{soldTickets}/{totalTickets} sold
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {minPrice > 0 && (
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">From ₹{minPrice.toLocaleString('en-IN')}</span>
                    )}
                    {minPrice === 0 && event.ticketTypes.length > 0 && (
                      <span className="text-xs font-semibold text-green-600">Free</span>
                    )}
                    <span className="flex-1" />
                    <Link href={`/organiser/events/${event.id}`} onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <Eye className="h-3 w-3" /> View
                    </Link>
                    {canEdit && (
                      <Link href={`/organiser/events/${event.id}/edit`} onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Pencil className="h-3 w-3" /> Edit
                      </Link>
                    )}
                    {hasAttendees && (
                      <Link href={`/organiser/events/${event.id}/attendees`} onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-full border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                        <Users className="h-3 w-3" /> View Attendees
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
