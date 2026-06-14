'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/events/event-card';
import apiClient from '@/lib/api-client';
import { ArrowRight } from 'lucide-react';

interface FeaturedEvent {
  slug: string;
  title: string;
  shortDesc: string | null;
  venue: string;
  city: string;
  startDate: string;
  imageUrl: string | null;
  category: { name: string };
  ticketTypes: { price: number }[];
}

export default function HomePage() {
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>([]);

  useEffect(() => {
    apiClient.get('/events/featured').then((res) => setFeaturedEvents(res.data.data)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Discover Amazing Events
            </h1>
            <p className="mt-6 text-lg leading-8 text-blue-100">
              Find and book tickets for concerts, sports, comedy shows, tech conferences and more.
              Your next unforgettable experience is just a click away.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/events">
                <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50">
                  Browse Events
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  Organise Events
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Events */}
      {featuredEvents.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Events</h2>
            <Link href="/events" className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredEvents.map((event) => (
              <EventCard key={event.slug} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Features Section */}
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-2xl font-bold text-gray-900">Why ThooviTickets?</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="rounded-lg bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
                🎵
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Wide Selection</h3>
              <p className="mt-2 text-sm text-gray-500">
                From music festivals to tech meetups, find events that match your interests.
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">
                🔒
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Secure Booking</h3>
              <p className="mt-2 text-sm text-gray-500">
                Safe and secure payment processing with instant ticket delivery.
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-2xl">
                📱
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Easy Access</h3>
              <p className="mt-2 text-sm text-gray-500">
                Digital tickets with QR codes. No printouts needed, just show your phone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
