'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/events/event-card';
import { HeroCarousel } from '@/components/events/hero-carousel';
import { ArrowRight, ShieldCheck, Zap, Headphones, Star, Quote } from 'lucide-react';

interface EventBanner {
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

interface AdminBanner {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkType: string;
  linkUrl: string | null;
  eventId: string | null;
  event: { slug: string; title: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
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

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  createdAt: string;
  user: { firstName: string; lastName: string; avatarUrl: string | null };
}

export default function HomePage() {
  const [eventBanners, setEventBanners] = useState<EventBanner[]>([]);
  const [adminBanners, setAdminBanners] = useState<AdminBanner[]>([]);
  const [featured, setFeatured] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/events/banners').catch(() => ({ data: { data: [] } })),
      apiClient.get('/events/featured').catch(() => ({ data: { data: [] } })),
      apiClient.get('/categories').catch(() => ({ data: { data: [] } })),
      apiClient.get('/reviews/public?limit=6').catch(() => ({ data: [] })),
    ]).then(([bannersRes, featuredRes, catsRes, reviewsRes]) => {
      const bannerData = bannersRes.data.data || {};
      setEventBanners(bannerData.eventBanners || []);
      setAdminBanners(bannerData.adminBanners || []);
      setFeatured(featuredRes.data.data);
      setCategories(catsRes.data.data);
      setReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : reviewsRes.data.data || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800">
      {/* Hero Carousel */}
      {loading ? (
        <div className="h-[300px] sm:h-[400px] lg:h-[500px] 2xl:h-150 animate-pulse bg-gray-200 dark:bg-gray-700" />
      ) : (
        <HeroCarousel eventBanners={eventBanners} adminBanners={adminBanners} />
      )}

      {/* Featured Experiences */}
      {loading ? (
        <section className="relative overflow-hidden py-10 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-50 via-white to-white dark:from-orange-900/20 dark:via-gray-800 dark:to-gray-800" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 sm:mb-10">
              <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 overflow-hidden">
                  <div className="h-48 animate-pulse bg-gray-200 dark:bg-gray-700" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="flex justify-between">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : featured.length > 0 ? (
        <section className="relative overflow-hidden py-10 sm:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-50 via-white to-white dark:from-orange-900/20 dark:via-gray-800 dark:to-gray-800" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Featured Experiences</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Hand-picked premium events just for you</p>
              </div>
              <Link href="/events" className="flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/20 px-4 py-2 text-sm font-semibold text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition">
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
      ) : null}

      {/* Explore by Interest */}
      {loading ? (
        <section className="relative overflow-hidden py-10 sm:py-20">
          <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 sm:mb-12 text-center">
              <div className="mx-auto h-8 w-56 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="mx-auto mt-2 h-4 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-800/80 p-6">
                  <div className="h-14 w-14 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : categories.length > 0 ? (
        <section className="relative overflow-hidden py-10 sm:py-20">
          <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-linear-to-r from-transparent via-orange-200 to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 sm:mb-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Explore by Interest</h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Find your next obsession through our curated categories</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {categories.slice(0, 10).map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/events?category=${cat.slug}`}
                  className="group flex flex-col items-center gap-2 sm:gap-3 rounded-2xl border border-gray-200/60 dark:border-gray-700/40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-6 text-center card-3d"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-2xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 group-hover:scale-110 transition-all overflow-hidden">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name} className="h-10 w-10 object-contain" />
                    ) : cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/')) ? (
                      <img src={cat.icon} alt={cat.name} className="h-10 w-10 object-contain" />
                    ) : (
                      cat.icon || '🎫'
                    )}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-orange-600">{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Why ThooviTickets */}
      <section className="relative overflow-hidden py-10 sm:py-20">
        <div className="absolute inset-0 bg-white dark:bg-gray-800" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-orange-50 dark:bg-orange-900/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-orange-50 dark:bg-orange-900/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 sm:mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Why ThooviTickets?</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 glass-light p-5 sm:p-8 text-center card-3d">
              <div className="mx-auto mb-4 sm:mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/20 animate-float">
                <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8 text-orange-500" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Guaranteed Trust</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Every ticket is verified through our secure platform, ensuring 100% authenticity and fraud protection.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 glass-light p-8 text-center card-3d">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/20 animate-float" style={{ animationDelay: '0.5s' }}>
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Speed of Access</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Find, select, and buy your tickets in under 30 seconds. No waiting rooms, no hassle.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 glass-light p-8 text-center card-3d">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-900/20 animate-float" style={{ animationDelay: '1s' }}>
                <Headphones className="h-8 w-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Easy Management</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                Organisers get a powerful dashboard with analytics, ticket management, and real-time sales tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Reviews */}
      {reviews.length > 0 && (
        <section className="relative overflow-hidden py-10 sm:py-20">
          <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-linear-to-r from-transparent via-orange-200 to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 sm:mb-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">What Our Customers Say</h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Real experiences from real ticket buyers</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-gray-200/60 dark:border-gray-700/40 glass-light p-6 card-3d"
                >
                  <Quote className="h-8 w-8 text-orange-200 dark:text-orange-800 mb-3 animate-float-slow" />
                  <div className="flex gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= review.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300 dark:text-gray-600'}`}
                      />
                    ))}
                  </div>
                  {review.title && (
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">{review.title}</p>
                  )}
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 mb-4">
                    {review.content.length > 180 ? `${review.content.slice(0, 180)}...` : review.content}
                  </p>
                  <div className="flex items-center gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-sm font-semibold text-orange-600">
                      {review.user.firstName.charAt(0)}{review.user.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {review.user.firstName} {review.user.lastName.charAt(0)}.
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gray-900 py-10 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-orange-900/30 via-transparent to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-orange-500/50 to-transparent" />
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl animate-float-slow" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl animate-float-slow" style={{ animationDelay: '2s' }} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:justify-between">
            <div className="max-w-lg text-center lg:text-left">
              <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
                Your Passport to <span className="text-orange-400">Every Stage</span>.
              </h2>
              <p className="mt-4 text-gray-400 leading-relaxed">
                Whether you&apos;re looking to discover events or organise your own, ThooviTickets
                has everything you need to create unforgettable experiences.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link href="/events">
                  <Button size="lg" className="rounded-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8">
                    Explore Events
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="lg" className="rounded-full bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 px-8">
                    Start Organising
                  </Button>
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
              <div className="rounded-2xl border border-gray-700/50 bg-gray-800/50 p-3 sm:p-6 backdrop-blur-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                  <ShieldCheck className="h-6 w-6 text-orange-400" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-white">Secure Payments</p>
              </div>
              <div className="rounded-2xl border border-gray-700/50 bg-gray-800/50 p-3 sm:p-6 backdrop-blur-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                  <Zap className="h-6 w-6 text-orange-400" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-white">Instant Tickets</p>
              </div>
              <div className="rounded-2xl border border-gray-700/50 bg-gray-800/50 p-3 sm:p-6 backdrop-blur-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                  <Headphones className="h-6 w-6 text-orange-400" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-white">24/7 Support</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
