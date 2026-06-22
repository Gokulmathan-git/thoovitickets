'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore, type CartItem } from '@/stores/cart-store';
import { Calendar, Tag, Minus, Plus, Share2, Clock } from 'lucide-react';
import { AttendeeForm, type AttendeeInfo } from '@/components/events/attendee-form';
import { EventCountdown } from '@/components/events/event-countdown';
import { EventReviews } from '@/components/reviews/event-reviews';

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
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  maxAttendees: number | null;
  timezone: string;
  saleCutoffDate: string | null;
  category: { name: string; slug: string };
  ticketTypes: TicketType[];
  organiser: { firstName: string; lastName: string; orgName: string | null };
}

export default function EventDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showAttendeeForm, setShowAttendeeForm] = useState(false);
  const { user } = useAuthStore();
  const { setCart } = useCartStore();

  useEffect(() => {
    apiClient
      .get(`/events/detail/${slug}`)
      .then(async (res) => {
        const ev = res.data.data;
        setEvent(ev);
        if (ev.latitude && ev.longitude) {
          setMapCoords({ lat: ev.latitude, lng: ev.longitude });
        } else {
          try {
            const query = [ev.venue, ev.city, ev.state].filter(Boolean).join(', ');
            const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await geo.json();
            if (data.length > 0) {
              setMapCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            }
          } catch { /* ignore */ }
        }
      })
      .catch(() => router.push('/events'))
      .finally(() => setLoading(false));
  }, [slug, router]);

  const handleAfterAttendee = async (attendeeList: AttendeeInfo[]) => {
    const itemsToAdd = event!.ticketTypes.filter((tt) => (quantities[tt.id] || 0) > 0);
    if (itemsToAdd.length === 0) return;

    setAddingToCart('all');
    setCartMessage(null);

    try {
      if (user) {
        const currentCartEventId = useCartStore.getState().eventId;
        if (currentCartEventId && currentCartEventId !== event!.id) {
          await apiClient.delete('/cart');
        }
        for (const tt of itemsToAdd) {
          const res = await apiClient.post('/cart/items', { ticketTypeId: tt.id, quantity: quantities[tt.id] });
          setCart(res.data.data.items, res.data.data.total, res.data.data.itemCount);
        }
        useCartStore.getState().setEventId(event!.id);
        useCartStore.getState().setAttendees(attendeeList);
        setShowAttendeeForm(false);
        setCartMessage('Added to cart! Go to cart to checkout.');
        const reset: Record<string, number> = {};
        itemsToAdd.forEach((tt) => { reset[tt.id] = 0; });
        setQuantities((q) => ({ ...q, ...reset }));
      } else {
        const guestItems: CartItem[] = itemsToAdd.map((tt) => ({
          id: `guest-${tt.id}`,
          quantity: quantities[tt.id],
          ticketType: { id: tt.id, name: tt.name, price: Number(tt.price), currency: 'INR', maxPerOrder: tt.maxPerOrder, available: tt.totalQty - tt.soldQty },
          event: { id: event!.id, title: event!.title, slug: event!.slug, startDate: event!.startDate, venue: event!.venue, city: event!.city, imageUrl: event!.imageUrl },
        }));
        useCartStore.getState().setGuestCheckout(guestItems, attendeeList, event!.id);
        setShowAttendeeForm(false);
        router.push('/checkout');
      }
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
        <div className="h-96 animate-pulse bg-gray-200 dark:bg-gray-700" />
        <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
          <div className="h-8 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-40 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
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
  const salesClosed = (event.saleCutoffDate && new Date() >= new Date(event.saleCutoffDate)) || new Date() >= new Date(event.startDate);

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <div className="relative">
        <div className="h-[350px] sm:h-[420px] lg:h-[460px] overflow-hidden">
          <img
            src={event.imageUrl || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&q=80'}
            alt={event.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 pb-8 pt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                {event.category.name}
              </span>
              <span className="text-xs sm:text-sm text-gray-300">
                {startDate.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })} &middot; {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h1 className="mt-3 sm:mt-4 max-w-2xl text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight text-white">
              {event.title}
            </h1>
            <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
              <button className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-orange-600 transition">
                <Calendar className="h-4 w-4" /> Add to Calendar
              </button>
              <button className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white dark:bg-gray-800/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition">
                <Share2 className="h-4 w-4" /> Share Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left Column */}
          <div className="flex-1 min-w-0 space-y-10">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-4 rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm">
                <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 p-3"><Calendar className="h-5 w-5 text-orange-500" /></div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Date & Time</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{startDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} — {endDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm">
                <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 p-3"><Clock className="h-5 w-5 text-orange-500" /></div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Duration</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))} hours</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{event.city}, {event.state || event.country}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">About the Experience</h2>
              <div className="mt-4 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{event.description}</div>
              {event.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                      <Tag className="h-3 w-3 text-gray-400 dark:text-gray-500" /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Venue & Location</h2>
              </div>
              <div className="relative h-64 bg-gray-100 dark:bg-gray-800">
                {mapCoords ? (
                  <iframe title="Event location" src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lng - 0.008},${mapCoords.lat - 0.004},${mapCoords.lng + 0.008},${mapCoords.lat + 0.004}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lng}`} className="h-full w-full border-0" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                    <div className="animate-pulse text-center"><div className="mx-auto mb-2 h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30" /><p>Loading map...</p></div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 p-4 sm:p-5">
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{event.venue}</p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{[event.address, event.city, event.state].filter(Boolean).join(', ')}</p>
                </div>
                <a href={mapCoords ? `https://www.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}` : `https://www.google.com/maps/search/${encodeURIComponent([event.venue, event.city, event.state].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="rounded-full text-xs">Open in Maps</Button>
                </a>
              </div>
            </section>

            <EventReviews eventId={event.id} />
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[370px] shrink-0">
            <div className="sticky top-20 space-y-4">
              <EventCountdown startDate={event.startDate} saleCutoffDate={event.saleCutoffDate} />

              <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Get Your Tickets</h2>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Secure your spot at this event</p>

                {cartMessage && (
                  <div className={`mt-3 rounded-lg p-2.5 text-sm font-medium ${cartMessage.includes('Failed') || cartMessage.includes('Only') ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'}`}>
                    {cartMessage}
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  {event.ticketTypes.map((tt) => {
                    const available = tt.totalQty - tt.soldQty;
                    const isSoldOut = available <= 0;
                    const tQty = quantities[tt.id] || 0;
                    const tMax = Math.min(tt.maxPerOrder, available);
                    return (
                      <div key={tt.id} className={`rounded-xl border-2 p-4 transition-all ${isSoldOut ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-50' : tQty > 0 ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-gray-100">{tt.name}</p>
                            {tt.description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{tt.description}</p>}
                            {!isSoldOut && <p className="mt-1 text-[11px] text-green-600 font-medium">{available} available</p>}
                            {isSoldOut && <p className="mt-1 text-[11px] font-semibold text-red-500">Sold Out</p>}
                          </div>
                          <p className="text-lg font-bold text-orange-600 whitespace-nowrap">{Number(tt.price) === 0 ? 'Free' : `₹${Number(tt.price).toLocaleString('en-IN')}`}</p>
                        </div>
                        {!isSoldOut && (
                          <div className="mt-3 flex items-center justify-end">
                            <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                              <button className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30" disabled={tQty <= 0} onClick={() => setQuantities((q) => ({ ...q, [tt.id]: Math.max(0, tQty - 1) }))}><Minus className="h-3.5 w-3.5" /></button>
                              <span className="w-8 text-center text-sm font-bold">{tQty}</span>
                              <button className="px-2.5 py-1.5 text-gray-500 hover:text-gray-900 disabled:opacity-30" disabled={tQty >= tMax} onClick={() => setQuantities((q) => ({ ...q, [tt.id]: Math.min(tMax, tQty + 1) }))}><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalSelected > 0 && (
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-900 px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{totalSelected} ticket{totalSelected !== 1 ? 's' : ''} selected</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">₹{totalPrice.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {salesClosed ? (
                  <Button className="mt-4 w-full rounded-xl bg-gray-400 py-6 text-base font-bold text-white cursor-not-allowed" disabled>Sales Closed</Button>
                ) : (
                  <Button className="mt-4 w-full rounded-xl bg-orange-500 py-6 text-base font-bold text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20" disabled={totalSelected === 0 || addingToCart !== null} onClick={() => setShowAttendeeForm(true)}>
                    {totalSelected > 0 ? `Get ${totalSelected} Ticket${totalSelected !== 1 ? 's' : ''} — ₹${totalPrice.toLocaleString('en-IN')}` : 'Select Tickets'}
                  </Button>
                )}
                <p className="mt-2.5 text-center text-[11px] text-gray-400 dark:text-gray-500">Non-refundable. T&Cs apply.</p>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">{orgName[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Organized by</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{orgName}</p>
                </div>
                <span className="text-sm font-semibold text-orange-500 cursor-pointer hover:text-orange-600">Follow</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAttendeeForm && event && (
        <AttendeeForm
          tickets={event.ticketTypes.filter((tt) => (quantities[tt.id] || 0) > 0).map((tt) => ({ ticketTypeId: tt.id, ticketName: tt.name, price: Number(tt.price), quantity: quantities[tt.id] }))}
          loading={addingToCart !== null}
          onClose={() => setShowAttendeeForm(false)}
          onSubmit={(attendees: AttendeeInfo[]) => handleAfterAttendee(attendees)}
        />
      )}
    </div>
  );
}
