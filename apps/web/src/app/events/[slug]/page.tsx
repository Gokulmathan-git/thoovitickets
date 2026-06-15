'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { Calendar, MapPin, Tag, Minus, Plus, Share2, Clock, ChevronRight } from 'lucide-react';

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
  const { setCart, addGuestItem } = useCartStore();

  useEffect(() => {
    apiClient
      .get(`/events/detail/${params.slug}`)
      .then((res) => {
        setEvent(res.data.data);
      })
      .catch(() => router.push('/events'))
      .finally(() => setLoading(false));
  }, [params.slug, router]);

  const handleAddAllToCart = async () => {
    const itemsToAdd = event!.ticketTypes.filter((tt) => (quantities[tt.id] || 0) > 0);
    if (itemsToAdd.length === 0) {
      setCartMessage('Select at least one ticket');
      return;
    }
    setAddingToCart('all');
    setCartMessage(null);
    try {
      for (const tt of itemsToAdd) {
        const qty = quantities[tt.id];
        if (user) {
          const res = await apiClient.post('/cart/items', { ticketTypeId: tt.id, quantity: qty });
          setCart(res.data.data.items, res.data.data.total, res.data.data.itemCount);
        } else {
          addGuestItem({
            id: `guest-${tt.id}`, quantity: qty,
            ticketType: { id: tt.id, name: tt.name, price: Number(tt.price), currency: 'INR', maxPerOrder: tt.maxPerOrder, available: tt.totalQty - tt.soldQty },
            event: { id: event!.id, title: event!.title, slug: event!.slug, startDate: event!.startDate, venue: event!.venue, city: event!.city, imageUrl: event!.imageUrl },
          });
        }
      }
      const summary = itemsToAdd.map((tt) => `${quantities[tt.id]} ${tt.name}`).join(', ');
      setCartMessage(`Added ${summary} to cart!`);
      const reset: Record<string, number> = {};
      itemsToAdd.forEach((tt) => { reset[tt.id] = 0; });
      setQuantities((q) => ({ ...q, ...reset }));
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setCartMessage(axiosError.response?.data?.error?.message || 'Failed to add');
    } finally {
      setAddingToCart(null);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="h-96 animate-pulse bg-gray-200" />
        <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
          <div className="h-8 w-1/2 animate-pulse rounded bg-gray-200" />
          <div className="h-40 animate-pulse rounded-xl bg-gray-200" />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const orgName = event.organiser.orgName || `${event.organiser.firstName} ${event.organiser.lastName}`;
  const totalSelected = event.ticketTypes.reduce((sum, tt) => sum + (quantities[tt.id] || 0), 0);
  const totalPrice = event.ticketTypes.reduce((sum, tt) => sum + Number(tt.price) * (quantities[tt.id] || 0), 0);

  return (
    <div className="bg-gray-50">
      {/* Hero — Full bleed image */}
      <div className="relative">
        <div className="h-[350px] sm:h-[420px] lg:h-[460px] overflow-hidden">
          <img
            src={event.imageUrl || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&q=80'}
            alt={event.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        {/* Overlay Content */}
        <div className="absolute bottom-0 left-0 right-0 pb-8 pt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                {event.category.name}
              </span>
              <span className="text-sm text-gray-300">
                {startDate.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })} &middot; {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              {event.title}
            </h1>
            <div className="mt-5 flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-orange-600 transition">
                <Calendar className="h-4 w-4" /> Add to Calendar
              </button>
              <button className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition">
                <Share2 className="h-4 w-4" /> Share Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* ── Left Column ── */}
          <div className="flex-1 min-w-0 space-y-10">
            {/* About */}
            <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold text-gray-900">About the Experience</h2>
              <div className="mt-4 text-[15px] leading-relaxed text-gray-600 whitespace-pre-wrap">
                {event.description}
              </div>
              {event.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                      <Tag className="h-3 w-3 text-gray-400" /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Venue & Location */}
            <section className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-gray-900">Venue & Location</h2>
              </div>
              <div className="relative h-52 bg-gray-100">
                <div className="flex h-full items-center justify-center">
                  <div className="rounded-full bg-orange-500 p-3 shadow-lg">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 p-5">
                <div>
                  <p className="font-bold text-gray-900">{event.venue}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {[event.address, event.city, event.state].filter(Boolean).join(', ')}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-full text-xs">
                  Open in Maps
                </Button>
              </div>
            </section>

            {/* Event Details Grid */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className="rounded-xl bg-orange-50 p-3">
                  <Calendar className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Date & Time</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {startDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} — {endDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm">
                <div className="rounded-xl bg-orange-50 p-3">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Duration</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))} hours
                  </p>
                  <p className="text-sm text-gray-500">{event.city}, {event.state || event.country}</p>
                </div>
              </div>
            </section>
          </div>

          {/* ── Right Column — Sticky ── */}
          <div className="w-full lg:w-[370px] shrink-0">
            <div className="sticky top-20 space-y-4">
              {/* Ticket Card */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900">Get Your Tickets</h2>
                <p className="mt-1 text-sm text-gray-400">Secure your spot at this event</p>

                {cartMessage && (
                  <div className={`mt-3 rounded-lg p-2.5 text-sm font-medium ${cartMessage.includes('Failed') || cartMessage.includes('Only') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {cartMessage}
                  </div>
                )}

                {/* Ticket Types — each with its own quantity */}
                <div className="mt-5 space-y-3">
                  {event.ticketTypes.map((tt) => {
                    const available = tt.totalQty - tt.soldQty;
                    const isSoldOut = available <= 0;
                    const tQty = quantities[tt.id] || 0;
                    const tMax = Math.min(tt.maxPerOrder, available);

                    return (
                      <div
                        key={tt.id}
                        className={`rounded-xl border-2 p-4 transition-all ${
                          isSoldOut ? 'border-gray-100 bg-gray-50 opacity-50'
                            : tQty > 0 ? 'border-orange-500 bg-orange-50/40'
                              : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900">{tt.name}</p>
                            {tt.description && <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{tt.description}</p>}
                            {!isSoldOut && <p className="mt-1 text-[11px] text-green-600 font-medium">{available} available</p>}
                            {isSoldOut && <p className="mt-1 text-[11px] font-semibold text-red-500">Sold Out</p>}
                          </div>
                          <p className="text-lg font-bold text-orange-600 whitespace-nowrap">
                            {Number(tt.price) === 0 ? 'Free' : `₹${Number(tt.price).toLocaleString('en-IN')}`}
                          </p>
                        </div>
                        {!isSoldOut && (
                          <div className="mt-3 flex items-center justify-end">
                            <div className="flex items-center rounded-lg border border-gray-300 bg-white">
                              <button className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30" disabled={tQty <= 0} onClick={() => setQuantities((q) => ({ ...q, [tt.id]: Math.max(0, tQty - 1) }))}>
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm font-bold">{tQty}</span>
                              <button className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30" disabled={tQty >= tMax} onClick={() => setQuantities((q) => ({ ...q, [tt.id]: Math.min(tMax, tQty + 1) }))}>
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Total Summary */}
                {totalSelected > 0 && (
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                    <span className="text-sm text-gray-600">{totalSelected} ticket{totalSelected !== 1 ? 's' : ''} selected</span>
                    <span className="text-lg font-bold text-gray-900">₹{totalPrice.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {/* CTA Button */}
                <Button
                  className="mt-4 w-full rounded-xl bg-orange-500 py-6 text-base font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                  disabled={totalSelected === 0 || addingToCart !== null}
                  onClick={handleAddAllToCart}
                >
                  {addingToCart ? 'Adding...' : totalSelected > 0 ? `Get ${totalSelected} Ticket${totalSelected !== 1 ? 's' : ''} — ₹${totalPrice.toLocaleString('en-IN')}` : 'Select Tickets'}
                </Button>
                <p className="mt-2.5 text-center text-[11px] text-gray-400">Non-refundable. T&Cs apply.</p>
              </div>

              {/* Organiser */}
              <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  {orgName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Organized by</p>
                  <p className="font-bold text-gray-900 truncate">{orgName}</p>
                </div>
                <span className="text-sm font-semibold text-orange-500 cursor-pointer hover:text-orange-600">Follow</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
