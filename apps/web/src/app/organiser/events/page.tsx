'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  slug: string;
  status: string;
  startDate: string;
  endDate: string;
  city: string;
  venue: string;
  category: { name: string };
  ticketTypes: { price: number }[];
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  PENDING_APPROVAL: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  APPROVED: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  PUBLISHED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  COMPLETED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

export default function OrganiserEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const url = filter ? `/events/my?status=${filter}` : '/events/my';
        const res = await apiClient.get(url);
        setEvents(res.data.data);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [filter]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">My Events</h1>
        <Link href="/organiser/events/create">
          <Button>Create Event</Button>
        </Link>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {['', 'DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => { setFilter(status); setLoading(true); }}
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium transition-colors',
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
            )}
          >
            {status === '' ? 'All' : statusLabels[status]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No events found.</p>
          <Link href="/organiser/events/create">
            <Button className="mt-4">Create Your First Event</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/organiser/events/${event.id}`}
              className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 wrap-break-word">{event.title}</h3>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', statusColors[event.status])}>
                      {statusLabels[event.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {event.venue}, {event.city} &middot; {event.category.name}
                  </p>
                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    {new Date(event.startDate).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  {event.ticketTypes.length > 0 && (
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      From ₹{Math.min(...event.ticketTypes.map((t) => Number(t.price)))}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
