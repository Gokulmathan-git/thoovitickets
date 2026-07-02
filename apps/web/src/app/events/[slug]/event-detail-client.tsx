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

interface GoodieVariant {
  id: string;
  size: string | null;
}

interface GoodieProduct {
  id: string;
  name: string;
  hasSizeVariant: boolean;
  variants: GoodieVariant[];
}

interface TicketGoodie {
  product: GoodieProduct;
}

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  totalQty: number;
  soldQty: number;
  maxPerOrder: number;
  isActive: boolean;
  saleStart: string | null;
  saleEnd: string | null;
  goodies?: TicketGoodie[];
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
  bannerUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  maxAttendees: number | null;
  timezone: string;
  saleCutoffDate: string | null;
  category: { name: string; slug: string };
  ticketTypes: TicketType[];
  organiser: { id: string; firstName: string; lastName: string; orgName: string | null; avatarUrl: string | null; orgTerms: string | null };
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
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [activeDiscount, setActiveDiscount] = useState<{
    code: string;
    type: 'PERCENTAGE' | 'FLAT';
    value: number;
  } | null>(null);
  const { user } = useAuthStore();
  const { setCart } = useCartStore();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    apiClient
      .get(`/events/detail/${slug}`)
      .then(async (res) => {
        const ev = res.data.data;
        setEvent(ev);

        // Try to fetch active public discounts for this event
        apiClient
          .get(`/events/${ev.id}/discounts`)
          .then((discountRes) => {
            const discounts = discountRes.data.data;
            if (Array.isArray(discounts) && discounts.length > 0) {
              // Use the first active public discount
              const d = discounts[0];
              setActiveDiscount({ code: d.code, type: d.type, value: d.value });
            }
          })
          .catch(() => {
            // Endpoint may not exist yet — silently ignore
          });

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
        router.push('/checkout');
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

  const handleAddToCalendar = () => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toGCal = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    const location = [event.venue, event.address, event.city, event.state].filter(Boolean).join(', ');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${toGCal(startDate)}/${toGCal(endDate)}`,
      details: `${event.shortDesc || event.title}\n\nBook tickets: ${window.location.href}`,
      location,
      sf: 'true',
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
  };

  const handleShare = async () => {
    const shareData = { title: event.title, text: event.shortDesc || event.title, url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      setShowShareMenu((v) => !v);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCartMessage('Link copied to clipboard!');
    setShowShareMenu(false);
    setTimeout(() => setCartMessage(null), 2000);
  };

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${event.title}\n${window.location.href}`)}`, '_blank');
    setShowShareMenu(false);
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
    setShowShareMenu(false);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      {/* Hero Image */}
      <div className="h-[300px] sm:h-[380px] lg:h-[420px] overflow-hidden">
        <img
          src={event.bannerUrl || event.imageUrl || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&q=80'}
          alt={event.title}
          className="h-full w-full object-cover object-center"
        />
      </div>

      {/* Event Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  {event.category.name}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-gray-900 dark:text-gray-100">
                {event.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300 shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                <span>{startDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}, {startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span>{Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))}h &middot; {event.city}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
            <button onClick={handleAddToCalendar} className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-orange-600 transition">
              <Calendar className="h-4 w-4" /> Add to Calendar
            </button>
            <div className="relative">
              <button onClick={handleShare} className="inline-flex items-center gap-2 rounded-full border border-gray-300 dark:border-gray-600 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <Share2 className="h-4 w-4" /> Share Event
              </button>
              {showShareMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <button onClick={copyLink} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                    Copy Link
                  </button>
                  <button onClick={shareToWhatsApp} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.604-1.207A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.153 0-4.144-.68-5.778-1.835l-.413-.267-2.733.717.73-2.667-.292-.433A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                    WhatsApp
                  </button>
                  <button onClick={shareToTwitter} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    X (Twitter)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Left Column */}
          <div className="flex-1 min-w-0 space-y-10">

            <section className="rounded-2xl glass-light p-6 sm:p-8">
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
              {mapCoords && (
                <div className="relative h-64 bg-gray-100 dark:bg-gray-800">
                  <iframe title="Event location" src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lng - 0.008},${mapCoords.lat - 0.004},${mapCoords.lng + 0.008},${mapCoords.lat + 0.004}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lng}`} className="h-full w-full border-0" loading="lazy" />
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800 p-4 sm:p-5">
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{event.venue}</p>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{[event.address, event.city, event.state].filter(Boolean).join(', ')}</p>
                </div>
                <a href={event.latitude && event.longitude ? `https://www.google.com/maps?q=${event.latitude},${event.longitude}` : `https://www.google.com/maps/search/${encodeURIComponent([event.venue, event.address, event.city, event.state].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="rounded-full text-xs">Open in Maps</Button>
                </a>
              </div>
            </section>

            {event.organiser.orgTerms && (
              <section className="rounded-2xl glass-light p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Terms & Conditions</h2>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  By {event.organiser.orgName || `${event.organiser.firstName} ${event.organiser.lastName}`}
                </p>
                <div className="mt-4 text-[14px] leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {event.organiser.orgTerms}
                </div>
              </section>
            )}

            <EventReviews eventId={event.id} />
          </div>

          {/* Right Column */}
          <div className="w-full lg:w-[370px] shrink-0">
            <div className="sticky top-20 space-y-4">
              <EventCountdown startDate={event.startDate} saleCutoffDate={event.saleCutoffDate} />

              <div className="rounded-2xl glass-light p-6 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Get Your Tickets</h2>
                <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Secure your spot at this event</p>

                {cartMessage && (
                  <div className={`mt-3 rounded-lg p-2.5 text-sm font-medium ${cartMessage.includes('Failed') || cartMessage.includes('Only') ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'}`}>
                    {cartMessage}
                  </div>
                )}

                <div className="mt-5 space-y-3">
                  {event.ticketTypes.map((tt) => {
                    const now = new Date();
                    const available = tt.totalQty - tt.soldQty;
                    const isSoldOut = available <= 0;
                    const saleNotStarted = tt.saleStart && new Date(tt.saleStart) > now;
                    const saleEnded = tt.saleEnd && new Date(tt.saleEnd) < now;
                    const isUnavailable = isSoldOut || saleNotStarted || saleEnded;
                    const tQty = quantities[tt.id] || 0;
                    const tMax = Math.min(tt.maxPerOrder, available);

                    let statusText = '';
                    let statusColor = '';
                    if (isSoldOut) {
                      statusText = 'Sold Out';
                      statusColor = 'text-red-500';
                    } else if (saleEnded) {
                      statusText = 'Sale Ended';
                      statusColor = 'text-red-500';
                    } else if (saleNotStarted) {
                      statusText = `Sale starts ${new Date(tt.saleStart!).toLocaleDateString('en-IN', { dateStyle: 'medium' })} at ${new Date(tt.saleStart!).toLocaleTimeString('en-IN', { timeStyle: 'short' })}`;
                      statusColor = 'text-amber-600 dark:text-amber-400';
                    }

                    return (
                      <div key={tt.id} className={`rounded-xl border-2 p-4 transition-all ${isUnavailable ? 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-60' : tQty > 0 ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-gray-100">{tt.name}</p>
                            {tt.description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{tt.description}</p>}
                            {statusText ? (
                              <p className={`mt-1 text-[11px] font-semibold ${statusColor}`}>{statusText}</p>
                            ) : (
                              <p className="mt-1 text-[11px] text-green-600 font-medium">{available} available</p>
                            )}
                            {tt.goodies && tt.goodies.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {tt.goodies.map((g) => (
                                  <span key={g.product.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    🎁 {g.product.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {Number(tt.price) === 0 ? (
                              <p className="text-lg font-bold text-orange-600">Free</p>
                            ) : activeDiscount ? (
                              <>
                                <p className="text-sm text-gray-400 line-through">₹{Number(tt.price).toLocaleString('en-IN')}</p>
                                <p className="text-lg font-bold text-orange-600">
                                  ₹{(activeDiscount.type === 'PERCENTAGE'
                                    ? Math.round(Number(tt.price) * (1 - activeDiscount.value / 100))
                                    : Math.max(0, Number(tt.price) - activeDiscount.value)
                                  ).toLocaleString('en-IN')}
                                </p>
                                <span className="inline-block mt-0.5 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
                                  {activeDiscount.type === 'PERCENTAGE' ? `${activeDiscount.value}% OFF` : `₹${activeDiscount.value} OFF`}
                                </span>
                              </>
                            ) : (
                              <p className="text-lg font-bold text-orange-600">₹{Number(tt.price).toLocaleString('en-IN')}</p>
                            )}
                          </div>
                        </div>
                        {!isUnavailable && (
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

              <div className="rounded-2xl glass-light p-5 hover-lift">
                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Organized by</p>
                <div className="flex items-center gap-3">
                  {event.organiser.avatarUrl ? (
                    <img src={event.organiser.avatarUrl} alt={orgName} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-sm font-bold text-orange-600">{orgName[0]}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{orgName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{event.organiser.firstName} {event.organiser.lastName}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAttendeeForm && event && (
        <AttendeeForm
          tickets={event.ticketTypes.filter((tt) => (quantities[tt.id] || 0) > 0).map((tt) => ({ ticketTypeId: tt.id, ticketName: tt.name, price: Number(tt.price), quantity: quantities[tt.id], goodies: tt.goodies?.map((g) => ({ productId: g.product.id, productName: g.product.name, hasSizeVariant: g.product.hasSizeVariant, variants: g.product.variants })) || [] }))}
          loading={addingToCart !== null}
          onClose={() => setShowAttendeeForm(false)}
          onSubmit={(attendees: AttendeeInfo[]) => handleAfterAttendee(attendees)}
        />
      )}
    </div>
  );
}
