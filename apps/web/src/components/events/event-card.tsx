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
      className="group relative block overflow-hidden rounded-2xl shadow-md card-3d"
    >
      {/* Full Card Image */}
      <div className="relative aspect-square w-full overflow-hidden">
        <img
          src={event.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80'}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />

        {/* Trending Badge */}
        {event.isFeatured && (
          <div className="absolute left-4 top-4">
            <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
              Trending
            </span>
          </div>
        )}

        {/* Content at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {/* Category + Date */}
          <div className="mb-2">
            <span className="text-sm font-medium text-orange-400">
              {event.category.name}
            </span>
            <span className="mx-2 text-gray-500">&bull;</span>
            <span className="text-sm text-gray-300">
              {dateStr}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold leading-tight text-white line-clamp-2">
            {event.title}
          </h3>

          {/* Location + Price */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm text-gray-300">
              <MapPin className="h-3.5 w-3.5" />
              <span>{event.city}</span>
            </div>
            {lowestPrice !== null && (
              <span className="rounded-full glass px-3 py-1 text-sm font-bold text-white">
                {lowestPrice === 0 ? 'Free' : `From ₹${lowestPrice.toLocaleString('en-IN')}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
