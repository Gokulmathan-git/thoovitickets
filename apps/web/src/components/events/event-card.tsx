'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';

interface EventCardProps {
  event: {
    slug: string;
    title: string;
    shortDesc: string | null;
    venue: string;
    city: string;
    startDate: string;
    imageUrl: string | null;
    isFeatured?: boolean;
    category: { name: string };
    ticketTypes: { price: number }[];
  };
}

export function EventCard({ event }: EventCardProps) {
  const lowestPrice = event.ticketTypes.length > 0
    ? Math.min(...event.ticketTypes.map((t) => Number(t.price)))
    : null;

  const startDate = new Date(event.startDate);
  const dateStr = startDate.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group block overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <img
          src={event.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80'}
          alt={event.title}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        {event.isFeatured && (
          <div className="absolute left-3 top-3">
            <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
              Trending
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-1.5 flex items-center gap-2 text-sm">
          <span className="font-medium text-orange-500">{event.category.name}</span>
          <span className="text-gray-300 dark:text-gray-600">&bull;</span>
          <span className="text-gray-500 dark:text-gray-400">{dateStr}</span>
        </div>
        <h3 className="text-lg font-bold leading-snug text-gray-900 dark:text-gray-100 line-clamp-2">
          {event.title}
        </h3>
        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="h-3.5 w-3.5" />
            <span>{event.city}</span>
          </div>
          {lowestPrice !== null && (
            <span className="rounded-full bg-orange-50 dark:bg-orange-900/20 px-3 py-1 text-sm font-bold text-orange-600">
              {lowestPrice === 0 ? 'Free' : `From ₹${lowestPrice.toLocaleString('en-IN')}`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
