'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Star, Eye, EyeOff, Pencil } from 'lucide-react';

interface EventMetrics {
  totalPurchased: number;
  attended: number;
  notAttended: number;
  cancelledTickets: number;
  attendanceRate: number;
  totalOrders: number;
  totalRevenue: number;
  organiserPayout: number;
  ticketTypes: { name: string; totalQty: number; soldQty: number; available: number; price: number }[];
}

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  totalQty: number;
  soldQty: number;
  maxPerOrder: number;
}

interface Event {
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
  status: string;
  tags: string[];
  showOnHomeBanner: boolean;
  homeBannerUrl: string | null;
  homeBannerTitle: string | null;
  homeBannerDesc: string | null;
  category: { name: string };
  ticketTypes: TicketType[];
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200',
  PENDING_APPROVAL: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  APPROVED: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  PUBLISHED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  REJECTED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  POSTPONED: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  POSTPONED: 'Postponed',
};

export default function OrganiserEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [bannerForm, setBannerForm] = useState({ url: '', title: '', desc: '' });
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [postponeForm, setPostponeForm] = useState({ startDate: '', endDate: '', message: '' });
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const [eventReviews, setEventReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{ averageRating: number; totalReviews: number } | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await apiClient.get(`/events/my/${params.id}`);
        setEvent(res.data.data);
        try {
          const metricsRes = await apiClient.get(`/analytics/event/${params.id}`);
          setMetrics(metricsRes.data.data);
        } catch {
          // metrics may not be available for all events
        }
        try {
          const reviewsRes = await apiClient.get(`/reviews/event/organiser/${params.id}`);
          setEventReviews(reviewsRes.data.reviews || []);
          setReviewStats({ averageRating: reviewsRes.data.averageRating, totalReviews: reviewsRes.data.totalReviews });
        } catch {
          // reviews may not be available
        }
      } catch {
        router.push('/organiser/events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [params.id, router]);

  const handleSubmitForApproval = async () => {
    if (!event) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/events/${event.id}/submit`);
      setEvent(res.data.data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to submit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !confirm('Are you sure you want to delete this draft event?')) return;
    setActionLoading(true);
    try {
      await apiClient.delete(`/events/${event.id}`);
      router.push('/organiser/events');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to delete');
      setActionLoading(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!event || !cancelReason.trim()) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/events/${event.id}/request-cancel`, { reason: cancelReason });
      alert('Cancellation request submitted. Admin will review it.');
      setShowCancelModal(false);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to cancel event');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostponeEvent = async () => {
    if (!event || !postponeForm.startDate || !postponeForm.endDate || !postponeForm.message.trim()) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/events/${event.id}/request-postpone`, {
        startDate: new Date(postponeForm.startDate).toISOString(),
        endDate: new Date(postponeForm.endDate).toISOString(),
        message: postponeForm.message,
      });
      alert('Postponement request submitted. Admin will review it.');
      setShowPostponeModal(false);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to postpone event');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}</div>;
  }

  if (!event) return null;

  const canEdit = event.status === 'DRAFT' || event.status === 'REJECTED';
  const canSubmit = event.status === 'DRAFT' || event.status === 'REJECTED';
  const canDelete = event.status === 'DRAFT';
  const canCancel = event.status === 'PUBLISHED' || event.status === 'APPROVED';
  const canPostpone = event.status === 'PUBLISHED';

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">{event.title}</h1>
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap', statusColors[event.status])}>
              {statusLabels[event.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{event.category.name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Link href={`/organiser/events/${event.id}/edit`}>
              <Button variant="outline">
                <Pencil className="mr-1.5 h-4 w-4" /> Edit Event
              </Button>
            </Link>
          )}
          {canSubmit && (
            <Button onClick={handleSubmitForApproval} disabled={actionLoading}>
              {actionLoading ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          )}
          {canPostpone && (
            <Button variant="outline" onClick={() => setShowPostponeModal(true)} disabled={actionLoading}>
              Request Postpone
            </Button>
          )}
          {canCancel && (
            <Button variant="destructive" onClick={() => setShowCancelModal(true)} disabled={actionLoading}>
              Request Cancel
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Rejection Reason */}
      {event.status === 'REJECTED' && (event as any).cancelReason && (
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="font-semibold text-red-800">Rejection Reason:</p>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">{(event as any).cancelReason}</p>
        </div>
      )}

      {/* Cancel Event Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-xl sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cancel Event</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">This will cancel all tickets and notify ticket holders. Refunds will be processed manually.</p>
            <textarea
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none dark:bg-gray-900 dark:text-gray-100"
              rows={3}
            />
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>Back</Button>
              <Button variant="destructive" onClick={handleCancelEvent} disabled={actionLoading || !cancelReason.trim()}>
                {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Postpone Event Modal */}
      {showPostponeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-xl sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Postpone Event</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Change the event dates. All ticket holders will be notified with your message.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">New Start Date *</label>
                <input type="datetime-local" value={postponeForm.startDate} onChange={(e) => setPostponeForm({ ...postponeForm, startDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none dark:bg-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">New End Date *</label>
                <input type="datetime-local" value={postponeForm.endDate} onChange={(e) => setPostponeForm({ ...postponeForm, endDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none dark:bg-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Message to Ticket Holders *</label>
                <textarea value={postponeForm.message} onChange={(e) => setPostponeForm({ ...postponeForm, message: e.target.value })}
                  placeholder="Explain why the event is being rescheduled..."
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none dark:bg-gray-900 dark:text-gray-100" rows={3} />
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPostponeModal(false)}>Back</Button>
              <Button className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white" onClick={handlePostponeEvent}
                disabled={actionLoading || !postponeForm.startDate || !postponeForm.endDate || !postponeForm.message.trim()}>
                {actionLoading ? 'Updating...' : 'Confirm Postpone'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-500 dark:text-gray-400">Description</span>
              <p className="mt-1 text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{event.description}</p>
            </div>
            {event.shortDesc && (
              <div>
                <span className="font-medium text-gray-500 dark:text-gray-400">Short Description</span>
                <p className="mt-1 text-gray-700 dark:text-gray-200">{event.shortDesc}</p>
              </div>
            )}
            {event.tags.length > 0 && (
              <div>
                <span className="font-medium text-gray-500 dark:text-gray-400">Tags</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {event.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-400">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="font-medium text-gray-500 dark:text-gray-400">Start</span>
                <p className="mt-1 text-gray-700 dark:text-gray-200">
                  {new Date(event.startDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-500 dark:text-gray-400">End</span>
                <p className="mt-1 text-gray-700 dark:text-gray-200">
                  {new Date(event.endDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-500 dark:text-gray-400">Venue</span>
              <p className="mt-1 text-gray-700 dark:text-gray-200">{event.venue}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500 dark:text-gray-400">Location</span>
              <p className="mt-1 text-gray-700 dark:text-gray-200">
                {[event.address, event.city, event.state, event.country].filter(Boolean).join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Ticket Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Price</th>
                    <th className="pb-2 font-medium">Total</th>
                    <th className="pb-2 font-medium">Sold</th>
                    <th className="pb-2 font-medium">Available</th>
                    <th className="pb-2 font-medium">Max/Order</th>
                  </tr>
                </thead>
                <tbody>
                  {event.ticketTypes.map((tt) => (
                    <tr key={tt.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 font-medium text-gray-900 dark:text-gray-100">{tt.name}</td>
                      <td className="py-3">₹{Number(tt.price).toLocaleString('en-IN')}</td>
                      <td className="py-3">{tt.totalQty}</td>
                      <td className="py-3">{tt.soldQty}</td>
                      <td className="py-3 font-medium text-green-600">{tt.totalQty - tt.soldQty}</td>
                      <td className="py-3">{tt.maxPerOrder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Event Metrics */}
        {metrics && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Event Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stat boxes */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Purchased</p>
                  <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{metrics.totalPurchased}</p>
                </div>
                <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Attended</p>
                  <p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">{metrics.attended}</p>
                </div>
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Not Attended</p>
                  <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{metrics.notAttended}</p>
                </div>
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Cancelled</p>
                  <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{metrics.cancelledTickets}</p>
                </div>
              </div>

              {/* Attendance rate progress bar */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">Attendance Rate</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{metrics.attendanceRate.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-green-400 to-green-600 transition-all duration-500"
                    style={{ width: `${Math.min(metrics.attendanceRate, 100)}%` }}
                  />
                </div>
              </div>

              {/* Revenue summary */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Revenue Summary</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Revenue</p>
                    <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-gray-100">
                      ₹{Number(metrics.totalRevenue).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Your Payout</p>
                    <p className="mt-0.5 text-lg font-bold text-green-600 dark:text-green-400">
                      ₹{Number(metrics.organiserPayout).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
                    <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-gray-100">{metrics.totalOrders}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Reviews */}
        {reviewStats && reviewStats.totalReviews > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  Customer Reviews
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({reviewStats.totalReviews})</span>
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <Star className="h-5 w-5 fill-orange-400 text-orange-400" />
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{reviewStats.averageRating}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eventReviews.map((review: any) => (
                  <div key={review.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {review.user.firstName} {review.user.lastName}
                        </span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s: number) => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300 dark:text-gray-600'}`} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        </span>
                      </div>
                      {review.title && <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{review.title}</p>}
                      <p className="text-sm text-gray-600 dark:text-gray-300">{review.content}</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await apiClient.patch(`/reviews/event/${review.id}/visibility`, { isVisible: !review.isVisible });
                          setEventReviews(prev => prev.map(r => r.id === review.id ? { ...r, isVisible: !r.isVisible } : r));
                        } catch { /* ignore */ }
                      }}
                      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        review.isVisible
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200'
                      }`}
                      title={review.isVisible ? 'Visible to public — click to hide' : 'Hidden from public — click to show'}
                    >
                      {review.isVisible ? <><Eye className="h-3.5 w-3.5" /> Visible</> : <><EyeOff className="h-3.5 w-3.5" /> Hidden</>}
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Homepage Banner Management */}
        {event.status === 'PUBLISHED' && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Homepage Banner</CardTitle>
            </CardHeader>
            <CardContent>
              {event.showOnHomeBanner ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400">
                    <span className="font-medium">Banner is ACTIVE</span> — Your event is showing on the homepage carousel
                  </div>
                  {event.homeBannerUrl && (
                    <div className="rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img src={event.homeBannerUrl} alt="Banner preview" className="w-full h-40 object-cover" />
                    </div>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Title:</span> {event.homeBannerTitle || event.title}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Description:</span> {event.homeBannerDesc || event.shortDesc || '-'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    disabled={bannerLoading}
                    onClick={async () => {
                      setBannerLoading(true);
                      try {
                        const res = await apiClient.patch(`/events/${event.id}/banner`, { showOnHomeBanner: false });
                        setEvent({ ...event, ...res.data.data });
                        setBannerMsg('Banner removed from homepage');
                      } catch { setBannerMsg('Failed to update'); }
                      finally { setBannerLoading(false); }
                    }}
                  >
                    Remove from Homepage
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show this event on the homepage banner carousel. Available for <span className="font-medium text-orange-600">PREMIUM</span> and <span className="font-medium text-orange-600">ENTERPRISE</span> plans.
                  </p>
                  {bannerMsg && (
                    <div className={`rounded-md p-2 text-sm ${bannerMsg.includes('Failed') || bannerMsg.includes('only') ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'}`}>
                      {bannerMsg}
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Banner Image URL *</label>
                      <input
                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-100"
                        placeholder="https://example.com/banner.jpg (1200x500 recommended)"
                        value={bannerForm.url}
                        onChange={(e) => setBannerForm({ ...bannerForm, url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Banner Title (optional)</label>
                      <input
                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-100"
                        placeholder="Custom title for the banner (defaults to event title)"
                        value={bannerForm.title}
                        onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Banner Description (optional)</label>
                      <input
                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-100"
                        placeholder="Short tagline for the banner"
                        value={bannerForm.desc}
                        onChange={(e) => setBannerForm({ ...bannerForm, desc: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    disabled={bannerLoading || !bannerForm.url}
                    onClick={async () => {
                      setBannerLoading(true);
                      setBannerMsg(null);
                      try {
                        const res = await apiClient.patch(`/events/${event.id}/banner`, {
                          showOnHomeBanner: true,
                          homeBannerUrl: bannerForm.url,
                          homeBannerTitle: bannerForm.title || undefined,
                          homeBannerDesc: bannerForm.desc || undefined,
                        });
                        setEvent({ ...event, ...res.data.data, showOnHomeBanner: true });
                        setBannerMsg('Banner enabled! Your event will appear on the homepage.');
                      } catch (err: unknown) {
                        const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
                        setBannerMsg(axiosError.response?.data?.error?.message || 'Failed to enable banner');
                      } finally {
                        setBannerLoading(false);
                      }
                    }}
                  >
                    {bannerLoading ? 'Enabling...' : 'Enable Homepage Banner'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
