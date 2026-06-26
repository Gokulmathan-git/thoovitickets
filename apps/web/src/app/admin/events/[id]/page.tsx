'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowLeft, MapPin, Calendar, Tag, User, Building, Ticket, Clock } from 'lucide-react';

interface EventDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  venue: string;
  address: string | null;
  city: string;
  state: string | null;
  country: string;
  startDate: string;
  endDate: string;
  timezone: string;
  status: string;
  tags: string[];
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  maxAttendees: number | null;
  category: { id: string; name: string };
  ticketTypes: {
    id: string; name: string; description: string | null;
    price: number; totalQty: number; soldQty: number; maxPerOrder: number;
    saleStart: string | null; saleEnd: string | null;
  }[];
  organiser: {
    id: string; firstName: string; lastName: string; email: string;
    phone: string | null; orgName: string | null; orgDescription: string | null;
    avatarUrl: string | null;
  };
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  PENDING_APPROVAL: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  PUBLISHED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft', PENDING_APPROVAL: 'Pending Approval', PUBLISHED: 'Published',
  REJECTED: 'Rejected', CANCELLED: 'Cancelled',
};

export default function AdminEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    apiClient.get(`/admin/events/${eventId}`)
      .then((res) => setEvent(res.data.data))
      .catch((err) => {
        console.error('Failed to load event:', err?.response?.data || err);
        setMessage({ type: 'error', text: err?.response?.data?.error?.message || 'Failed to load event details' });
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleAction = async (action: 'APPROVED' | 'REJECTED') => {
    if (action === 'REJECTED' && !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      const body: any = { action };
      if (action === 'REJECTED') body.reason = rejectReason;
      await apiClient.post(`/admin/events/${eventId}/review`, body);
      setMessage({ type: 'success', text: action === 'APPROVED' ? 'Event published successfully!' : 'Event rejected.' });
      setShowRejectModal(false);
      const res = await apiClient.get(`/admin/events/${eventId}`);
      setEvent(res.data.data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage({ type: 'error', text: axiosError.response?.data?.error?.message || 'Action failed' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}</div>;
  }

  if (!event) {
    return (
      <div>
        <button onClick={() => router.push('/admin/events')} className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </button>
        {message && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">{message.text}</div>
        )}
      </div>
    );
  }

  const isPending = event.status === 'PENDING_APPROVAL';

  return (
    <div>
      <button onClick={() => router.push('/admin/events')} className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        <ArrowLeft className="h-4 w-4" /> Back to Events
      </button>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">{event.title}</h1>
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', statusColors[event.status])}>
              {statusLabels[event.status] || event.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{event.category.name}</p>
        </div>

        {isPending && (
          <div className="flex gap-2">
            <Button onClick={() => handleAction('APPROVED')} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 text-white">
              {actionLoading ? 'Publishing...' : 'Publish Event'}
            </Button>
            <Button variant="destructive" onClick={() => setShowRejectModal(true)} disabled={actionLoading}>
              Reject
            </Button>
          </div>
        )}
      </div>

      {message && (
        <div className={`mb-4 rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Reject Event</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Provide a reason so the organiser knows what to fix.</p>
            <textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 dark:bg-gray-900 dark:text-gray-100"
              rows={3}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleAction('REJECTED')} disabled={actionLoading || !rejectReason.trim()}>
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Event Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Image */}
          {event.imageUrl && (
            <img src={event.imageUrl} alt={event.title} className="w-full rounded-xl object-cover max-h-72" />
          )}

          {/* Description */}
          <Card>
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{event.description}</p>
              {event.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {event.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                      <Tag className="mr-1 inline h-3 w-3" />{tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Date & Location */}
          <Card>
            <CardHeader><CardTitle className="text-base">Date & Location</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-orange-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(event.startDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {new Date(event.startDate).toLocaleTimeString('en-IN', { timeStyle: 'short' })} —{' '}
                    {new Date(event.endDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })},{' '}
                    {new Date(event.endDate).toLocaleTimeString('en-IN', { timeStyle: 'short' })}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Timezone: {event.timezone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-orange-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{event.venue}</p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {[event.address, event.city, event.state, event.country].filter(Boolean).join(', ')}
                  </p>
                  {event.latitude && event.longitude && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Coordinates: {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
              {event.maxAttendees && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-orange-500 shrink-0" />
                  <p className="text-gray-700 dark:text-gray-300">Max Attendees: <span className="font-medium">{event.maxAttendees.toLocaleString()}</span></p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ticket Types */}
          <Card>
            <CardHeader><CardTitle className="text-base">Ticket Types ({event.ticketTypes.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.ticketTypes.map((tt) => (
                  <div key={tt.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{tt.name}</p>
                        {tt.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tt.description}</p>}
                      </div>
                      <p className="text-lg font-bold text-orange-600">
                        {Number(tt.price) === 0 ? 'Free' : `₹${Number(tt.price).toLocaleString('en-IN')}`}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span><Ticket className="mr-1 inline h-3 w-3" />Qty: {tt.totalQty}</span>
                      <span>Max/Order: {tt.maxPerOrder}</span>
                      <span>Sold: {tt.soldQty}</span>
                    </div>
                    {(tt.saleStart || tt.saleEnd) && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                        {tt.saleStart && (
                          <span><Clock className="mr-1 inline h-3 w-3" />Sale Start: {new Date(tt.saleStart).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                        )}
                        {tt.saleEnd && (
                          <span>Sale End: {new Date(tt.saleEnd).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Organiser Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Organiser</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {event.organiser.avatarUrl ? (
                  <img src={event.organiser.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-lg font-bold text-orange-600">
                    {event.organiser.firstName[0]}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {event.organiser.firstName} {event.organiser.lastName}
                  </p>
                  {event.organiser.orgName && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Building className="h-3 w-3" /> {event.organiser.orgName}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-gray-700 dark:text-gray-300">{event.organiser.email}</p>
                </div>
                {event.organiser.phone && (
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="text-gray-700 dark:text-gray-300">{event.organiser.phone}</p>
                  </div>
                )}
                {event.organiser.orgDescription && (
                  <div>
                    <p className="text-xs text-gray-400">About</p>
                    <p className="text-gray-700 dark:text-gray-300 text-xs line-clamp-3">{event.organiser.orgDescription}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {isPending && (
            <Card>
              <CardHeader><CardTitle className="text-base">Review Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Review the event details, organiser info, and ticket configuration before publishing.
                </p>
                <Button onClick={() => handleAction('APPROVED')} disabled={actionLoading} className="w-full bg-green-600 hover:bg-green-700 text-white">
                  {actionLoading ? 'Publishing...' : 'Publish Event'}
                </Button>
                <Button variant="destructive" onClick={() => setShowRejectModal(true)} disabled={actionLoading} className="w-full">
                  Reject with Reason
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
