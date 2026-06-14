'use client';

import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';

interface EventCardProps {
  event: {
    slug: string;
    title: string;
    shortDesc: string | null;
    venue: string;
    city: string;
    startDate: string;
    imageUrl: string | null;
    category: { name: string };
    ticketTypes: { price: number }[];
  };
}

export function EventCard({ event }: EventCardProps) {
  const lowestPrice = event.ticketTypes.length > 0
    ? Math.min(...event.ticketTypes.map((t) => Number(t.price)))
    : null;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-[16/9] bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl">🎫</span>
        )}
      </div>
      <div className="p-4">
        <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          {event.category.name}
        </span>
        <h3 className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-1">
          {event.title}
        </h3>
        {event.shortDesc && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{event.shortDesc}</p>
        )}
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            {new Date(event.startDate).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            {event.venue}, {event.city}
          </div>
        </div>
        {lowestPrice !== null && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <span className="text-lg font-bold text-gray-900">
              {lowestPrice === 0 ? 'Free' : `₹${lowestPrice.toLocaleString('en-IN')}`}
            </span>
            {lowestPrice > 0 && <span className="text-sm text-gray-500"> onwards</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
