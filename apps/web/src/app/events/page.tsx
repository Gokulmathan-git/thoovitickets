'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search, MapPin, SlidersHorizontal, X, Calendar } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface Event {
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
}

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><div className="h-96 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" /></div>}>
      <EventsContent />
    </Suspense>
  );
}

function EventsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [mobileFilters, setMobileFilters] = useState(false);

  const currentCategory = searchParams.get('category') || '';
  const currentCity = searchParams.get('city') || '';
  const currentPage = Number(searchParams.get('page') || '1');
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sort') || 'date_asc';

  useEffect(() => {
    Promise.all([
      apiClient.get('/categories'),
      apiClient.get('/events/cities'),
    ]).then(([catsRes, citiesRes]) => {
      setCategories(catsRes.data.data);
      setCities(citiesRes.data.data);
    });
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('limit', '12');
        params.set('sort', currentSort);
        if (currentCategory) params.set('category', currentCategory);
        if (currentCity) params.set('city', currentCity);
        if (currentSearch) params.set('search', currentSearch);

        const res = await apiClient.get(`/events?${params.toString()}`);
        const data = res.data.data;
        setEvents(data.events);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [currentCategory, currentCity, currentPage, currentSearch, currentSort]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (updates.category !== undefined || updates.search !== undefined || updates.city !== undefined) {
      params.delete('page');
    }
    router.push(`/events?${params.toString()}`);
  };

  const resetFilters = () => {
    setSearchInput('');
    router.push('/events');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput });
  };

  const hasFilters = currentCategory || currentCity || currentSearch;

  // Sidebar content (shared between desktop and mobile)
  const filterContent = (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search events..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 py-2.5 pl-10 pr-3 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </form>
      </div>

      {/* Date Filter */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Date</h3>
        <div className="space-y-2">
          {['Anytime', 'This Weekend', 'Next Week'].map((label) => (
            <label key={label} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="date" className="h-4 w-4 text-orange-500 accent-orange-500" defaultChecked={label === 'Anytime'} />
              <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* City Filter */}
      {cities.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Popular Cities</h3>
          <select
            value={currentCity}
            onChange={(e) => updateParams({ city: e.target.value })}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      )}

      {/* Category Filter */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Categories</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label key={cat.slug} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={currentCategory === cat.slug}
                onChange={() => updateParams({ category: currentCategory === cat.slug ? '' : cat.slug })}
                className="h-4 w-4 rounded border-gray-300 text-orange-500 accent-orange-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={resetFilters}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 transition"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Reset Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <div className="sticky top-20">
            {filterContent}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row items-start justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Experience the Extraordinary</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {total > 0 ? `${total} event${total !== 1 ? 's' : ''} found` : 'Discover amazing events'}
                {currentCategory && ` in ${currentCategory}`}
                {currentCity && ` near ${currentCity}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setMobileFilters(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>

              {/* Sort */}
              <select
                value={currentSort}
                onChange={(e) => updateParams({ sort: e.target.value })}
                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="date_asc">Date: Soonest</option>
                <option value="date_desc">Date: Latest</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-20 text-center">
              <Calendar className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-lg font-medium text-gray-500 dark:text-gray-400">No events found</p>
              <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                {hasFilters ? 'Try adjusting your filters' : 'Check back later for upcoming events'}
              </p>
              {hasFilters && (
                <button onClick={resetFilters} className="mt-4 text-sm font-medium text-orange-500 hover:text-orange-600">
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {events.map((event) => (
                  <EventListCard key={event.slug} event={event} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => updateParams({ page: String(currentPage - 1) })}
                  >
                    Previous
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => updateParams({ page: String(p) })}
                        className={cn(
                          'h-9 w-9 rounded-lg text-sm font-medium transition',
                          p === currentPage ? 'bg-orange-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => updateParams({ page: String(currentPage + 1) })}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileFilters(false)} />
          <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Filters</h2>
              <button onClick={() => setMobileFilters(false)}>
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            {filterContent}
            <Button className="mt-6 w-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700" onClick={() => setMobileFilters(false)}>
              Show Results
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Event card for the listing page — different style from homepage cards
function EventListCard({ event }: { event: Event }) {
  const lowestPrice = event.ticketTypes.length > 0
    ? Math.min(...event.ticketTypes.map((t) => Number(t.price)))
    : null;

  const startDate = new Date(event.startDate);
  const dateStr = startDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  const timeStr = startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="group overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm transition-all hover:shadow-lg">
      {/* Image */}
      <Link href={`/events/${event.slug}`} className="relative block aspect-[16/10] overflow-hidden">
        <img
          src={event.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80'}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

        {/* Badge */}
        {event.isFeatured && (
          <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
            Trending
          </span>
        )}

        {/* Date overlay */}
        <div className="absolute bottom-3 left-3">
          <span className="text-xs font-semibold text-white">
            {dateStr} &middot; {timeStr}
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/events/${event.slug}`}>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-orange-600 transition-colors">
            {event.title}
          </h3>
        </Link>
        {event.shortDesc && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{event.shortDesc}</p>
        )}
        <div className="mt-2 flex items-center gap-1 text-sm text-gray-400 dark:text-gray-500">
          <MapPin className="h-3.5 w-3.5" />
          <span>{event.venue}, {event.city}</span>
        </div>

        {/* Price + CTA */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {lowestPrice === 0 ? 'Entry' : 'Starts from'}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {lowestPrice === null ? '-' : lowestPrice === 0 ? 'Free' : `₹${lowestPrice.toLocaleString('en-IN')}`}
            </p>
          </div>
          <Link href={`/events/${event.slug}`}>
            <Button size="sm" className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full px-5">
              Get Tickets
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
