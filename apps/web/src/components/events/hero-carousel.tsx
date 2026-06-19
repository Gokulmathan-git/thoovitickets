'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

interface HeroCarouselProps {
  banners: Banner[];
}

interface Slide {
  type: 'banner' | 'default';
  image: string;
  title: string;
  subtitle: string;
  badge?: string;
  price?: number | null;
  slug?: string;
}

// Website-owned banners — replace image URLs with your own branded images when ready
const defaultSlides: Slide[] = [
  {
    type: 'default',
    image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=80',
    title: 'Experience the Extraordinary',
    subtitle: 'From sold-out stadium concerts to intimate underground galleries. Discover and secure your place at the world\'s most sought-after events.',
  },
  {
    type: 'default',
    image: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=1400&q=80',
    title: 'Create Your Own Event',
    subtitle: 'Are you an event organiser? List your events on ThooviTickets and reach thousands of attendees.',
  },
];

export function HeroCarousel({ banners }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);

  // Build combined slides: organiser banners first, then default slides at the end
  const bannerSlides: Slide[] = banners.map((b) => ({
    type: 'banner' as const,
    image: b.homeBannerUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&q=80',
    title: b.homeBannerTitle || b.title,
    subtitle: b.homeBannerDesc || b.shortDesc || `${b.venue}, ${b.city}`,
    badge: b.category.name,
    price: b.ticketTypes.length > 0 ? Number(b.ticketTypes[0].price) : null,
    slug: b.slug,
  }));

  const allSlides = [...bannerSlides, ...defaultSlides];
  const totalSlides = allSlides.length;

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % totalSlides);
  }, [totalSlides]);

  const prev = () => {
    setCurrent((c) => (c - 1 + totalSlides) % totalSlides);
  };

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = allSlides[current];

  return (
    <div className="relative overflow-hidden bg-gray-900">
      <div className="relative h-[450px] sm:h-[500px]">
        <img
          src={slide.image}
          alt={slide.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-black/20" />

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
            {/* Badge */}
            {slide.badge && (
              <span className="inline-block rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow">
                {slide.badge}
              </span>
            )}

            {/* Title */}
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
              {slide.type === 'default' && slide.title.includes('Extraordinary') ? (
                <>Experience the <span className="text-orange-400">Extraordinary</span>.</>
              ) : slide.type === 'default' && slide.title.includes('Create') ? (
                <>Create Your Own <span className="text-orange-400">Event</span>.</>
              ) : (
                slide.title
              )}
            </h2>

            {/* Subtitle */}
            <p className="mt-3 max-w-xl text-base text-gray-300 sm:text-lg">
              {slide.subtitle}
            </p>

            {/* CTA */}
            <div className="mt-5 flex items-center gap-4">
              {slide.type === 'banner' && slide.price !== null && slide.price !== undefined && (
                <span className="text-xl font-bold text-white">
                  {slide.price === 0 ? 'Free' : `From ₹${slide.price.toLocaleString('en-IN')}`}
                </span>
              )}
              {slide.type === 'banner' && slide.slug ? (
                <Link href={`/events/${slide.slug}`}>
                  <Button className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full px-6">
                    Get Tickets
                  </Button>
                </Link>
              ) : (
                <Link href={slide.title.includes('Create') ? '/register?role=organiser' : '/events'}>
                  <Button className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full px-6">
                    {slide.title.includes('Create') ? 'Start Organising' : 'Find Tickets'}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {totalSlides > 1 && (
        <>
          <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-gray-800/15 p-2.5 text-white backdrop-blur-sm hover:bg-white/25 transition">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white dark:bg-gray-800/15 p-2.5 text-white backdrop-blur-sm hover:bg-white/25 transition">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots */}
      {totalSlides > 1 && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {allSlides.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${
                i === current
                  ? 'w-8 bg-orange-500'
                  : s.type === 'banner'
                    ? 'w-2 bg-white/60'
                    : 'w-2 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
