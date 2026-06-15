'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/events/event-card';
import { HeroCarousel } from '@/components/events/hero-carousel';
import { ArrowRight, ShieldCheck, Zap, Gift } from 'lucide-react';

interface Banner {
  id: string;
  slug: string;
  title: string;
  homeBannerUrl: string | null;
  homeBannerTitle: string | null;
  homeBannerDesc: string | null;
  shortDesc: string | null;
  startDate: string;
  venue: string;
  city: string;
  category: { name: string };
  ticketTypes: { price: number }[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
}

interface Event {
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
  const [banners, setBanners] = useState<Banner[]>([]);
  const [featured, setFeatured] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    Promise.all([
      apiClient.get('/events/banners').catch(() => ({ data: { data: [] } })),
      apiClient.get('/events/featured').catch(() => ({ data: { data: [] } })),
      apiClient.get('/categories').catch(() => ({ data: { data: [] } })),
    ]).then(([bannersRes, featuredRes, catsRes]) => {
      setBanners(bannersRes.data.data);
      setFeatured(featuredRes.data.data);
      setCategories(catsRes.data.data);
    });
  }, []);

  return (
    <div className="bg-white">
      {/* Hero Carousel */}
      <HeroCarousel banners={banners} />

      {/* Featured Experiences */}
      {featured.length > 0 && (
        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-50 via-white to-white" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Featured Experiences</h2>
                <p className="mt-2 text-sm text-gray-500">Hand-picked premium events just for you</p>
              </div>
              <Link href="/events" className="flex items-center gap-1 rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-100 transition">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Explore by Interest */}
      {categories.length > 0 && (
        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0 bg-gray-50" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-orange-200 to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-gray-900">Explore by Interest</h2>
              <p className="mt-2 text-gray-500">Find your next obsession through our curated categories</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {categories.slice(0, 10).map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/events?category=${cat.slug}`}
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-6 text-center shadow-sm transition-all hover:border-orange-300 hover:shadow-lg hover:-translate-y-1"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl group-hover:bg-orange-100 group-hover:scale-110 transition-all">
                    {cat.icon || '🎫'}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-600">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why ThooviTickets */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-white" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-orange-50 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-orange-50 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Why ThooviTickets?</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                <ShieldCheck className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Guaranteed Trust</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                Every ticket is verified through our secure platform, ensuring 100% authenticity and fraud protection.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Speed of Access</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                Find, select, and buy your tickets in under 30 seconds. No waiting rooms, no hassle.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                <Gift className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Easy Management</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">
                Organisers get a powerful dashboard with analytics, ticket management, and real-time sales tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gray-900 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-orange-900/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:justify-between">
            <div className="max-w-lg text-center lg:text-left">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Your Passport to <span className="text-orange-400">Every Stage</span>.
              </h2>
              <p className="mt-4 text-gray-400 leading-relaxed">
                Whether you&apos;re looking to discover events or organise your own, ThooviTickets
                has everything you need to create unforgettable experiences.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link href="/events">
                  <Button size="lg" className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-8">
                    Explore Events
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 px-8">
                    Start Organising
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-2xl border border-gray-700/50 bg-gray-800/50 p-6 backdrop-blur-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                  <ShieldCheck className="h-6 w-6 text-orange-400" />
                </div>
                <p className="text-sm font-semibold text-white">Secure Payments</p>
              </div>
              <div className="rounded-2xl border border-gray-700/50 bg-gray-800/50 p-6 backdrop-blur-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                  <Zap className="h-6 w-6 text-orange-400" />
                </div>
                <p className="text-sm font-semibold text-white">Instant Tickets</p>
              </div>
              <div className="rounded-2xl border border-gray-700/50 bg-gray-800/50 p-6 backdrop-blur-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                  <Gift className="h-6 w-6 text-orange-400" />
                </div>
                <p className="text-sm font-semibold text-white">24/7 Support</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
