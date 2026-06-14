'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, User, Tag, Plus, Minus } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  totalQty: number;
  soldQty: number;
  maxPerOrder: number;
  isActive: boolean;
}

interface EventDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDesc: string | null;
  venue: string;
  address: string | null;
  city: string;
  state: string | null;
  country: string;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  tags: string[];
  maxAttendees: number | null;
  category: { name: string; slug: string };
  ticketTypes: TicketType[];
  organiser: { firstName: string; lastName: string; orgName: string | null };
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { setCart } = useCartStore();

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await apiClient.get(`/events/detail/${params.slug}`);
        setEvent(res.data.data);
      } catch {
        router.push('/events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [params.slug, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-8 w-1/2 animate-pulse rounded bg-gray-200" />
          <div className="h-32 animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const isSameDay = startDate.toDateString() === endDate.toDateString();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-8 overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-8 text-white">
        <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
          {event.category.name}
        </span>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{event.title}</h1>
        {event.shortDesc && <p className="mt-2 text-lg text-white/80">{event.shortDesc}</p>}
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <div>
              <p className="font-medium">
                {startDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-white/70">
                {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {isSameDay
                  ? endDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                  : endDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <div>
              <p className="font-medium">{event.venue}</p>
              <p className="text-white/70">{[event.city, event.state].filter(Boolean).join(', ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <p className="font-medium">{event.organiser.orgName || `${event.organiser.firstName} ${event.organiser.lastName}`}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About This Event</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-gray max-w-none text-gray-700 whitespace-pre-wrap">
                {event.description}
              </div>
              {event.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                      <Tag className="h-3 w-3" /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {event.address && (
            <Card>
              <CardHeader>
                <CardTitle>Venue Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-gray-900">{event.venue}</p>
                <p className="text-sm text-gray-500">
                  {[event.address, event.city, event.state, event.country].filter(Boolean).join(', ')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Tickets */}
        <div>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cartMessage && (
                <div className="rounded-md bg-green-50 p-2 text-sm text-green-700">{cartMessage}</div>
              )}
              {event.ticketTypes.map((tt) => {
                const available = tt.totalQty - tt.soldQty;
                const isSoldOut = available <= 0;
                const qty = quantities[tt.id] || 1;
                const maxQty = Math.min(tt.maxPerOrder, available);

                return (
                  <div key={tt.id} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{tt.name}</p>
                        {tt.description && <p className="text-xs text-gray-500">{tt.description}</p>}
                      </div>
                      <p className="font-bold text-gray-900">
                        {Number(tt.price) === 0 ? 'Free' : `₹${Number(tt.price).toLocaleString('en-IN')}`}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs ${isSoldOut ? 'text-red-600' : 'text-green-600'}`}>
                        {isSoldOut ? 'Sold Out' : `${available} available`}
                      </span>
                      {!isSoldOut && user && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center rounded-md border border-gray-300">
                            <button
                              className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                              disabled={qty <= 1}
                              onClick={() => setQuantities((q) => ({ ...q, [tt.id]: Math.max(1, qty - 1) }))}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2 text-sm font-medium">{qty}</span>
                            <button
                              className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                              disabled={qty >= maxQty}
                              onClick={() => setQuantities((q) => ({ ...q, [tt.id]: Math.min(maxQty, qty + 1) }))}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <Button
                            size="sm"
                            disabled={addingToCart === tt.id}
                            onClick={async () => {
                              setAddingToCart(tt.id);
                              setCartMessage(null);
                              try {
                                const res = await apiClient.post('/cart/items', { ticketTypeId: tt.id, quantity: qty });
                                const data = res.data.data;
                                setCart(data.items, data.total, data.itemCount);
                                setCartMessage(`Added ${qty} ${tt.name} ticket(s) to cart`);
                                setQuantities((q) => ({ ...q, [tt.id]: 1 }));
                              } catch (err: unknown) {
                                const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
                                setCartMessage(axiosError.response?.data?.error?.message || 'Failed to add to cart');
                              } finally {
                                setAddingToCart(null);
                              }
                            }}
                          >
                            {addingToCart === tt.id ? '...' : 'Add'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!user && (
                <p className="text-center text-sm text-gray-500">
                  <a href="/login" className="text-blue-600 hover:underline">Sign in</a> to add tickets to cart
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
