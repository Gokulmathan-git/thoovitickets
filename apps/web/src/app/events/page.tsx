'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { EventCard } from '@/components/events/event-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
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

export default function EventsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><div className="h-96 animate-pulse rounded-lg bg-gray-200" /></div>}>
      <EventsContent />
    </Suspense>
  );
}

function EventsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const currentCategory = searchParams.get('category') || '';
  const currentPage = Number(searchParams.get('page') || '1');
  const currentSearch = searchParams.get('search') || '';

  useEffect(() => {
    apiClient.get('/categories').then((res) => setCategories(res.data.data));
  }, []);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('limit', '12');
        if (currentCategory) params.set('category', currentCategory);
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
  }, [currentCategory, currentPage, currentSearch]);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (updates.category !== undefined || updates.search !== undefined) {
      params.delete('page');
    }
    router.push(`/events?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Discover Events</h1>
        <p className="mt-2 text-gray-500">Find amazing events happening near you</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search events, venues, or cities..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Category Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <button
          onClick={() => updateParams({ category: '' })}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            !currentCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => updateParams({ category: cat.slug })}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              currentCategory === cat.slug ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-lg text-gray-500">No events found.</p>
          <p className="mt-2 text-sm text-gray-400">
            {currentSearch || currentCategory
              ? 'Try adjusting your search or filters.'
              : 'Check back later for upcoming events.'}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">{total} event{total !== 1 ? 's' : ''} found</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.slug} event={event} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => updateParams({ page: String(currentPage - 1) })}
              >
                Previous
              </Button>
              <span className="px-4 text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
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
  );
}
