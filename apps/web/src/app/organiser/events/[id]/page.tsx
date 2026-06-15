'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  REJECTED: 'Rejected',
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

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await apiClient.get(`/events/my/${params.id}`);
        setEvent(res.data.data);
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

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200" />)}</div>;
  }

  if (!event) return null;

  const canSubmit = event.status === 'DRAFT' || event.status === 'REJECTED';
  const canDelete = event.status === 'DRAFT';

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', statusColors[event.status])}>
              {statusLabels[event.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{event.category.name}</p>
        </div>
        <div className="flex gap-2">
          {canSubmit && (
            <Button onClick={handleSubmitForApproval} disabled={actionLoading}>
              {actionLoading ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-500">Description</span>
              <p className="mt-1 text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>
            {event.shortDesc && (
              <div>
                <span className="font-medium text-gray-500">Short Description</span>
                <p className="mt-1 text-gray-700">{event.shortDesc}</p>
              </div>
            )}
            {event.tags.length > 0 && (
              <div>
                <span className="font-medium text-gray-500">Tags</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {event.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-500">Start</span>
                <p className="mt-1 text-gray-700">
                  {new Date(event.startDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-500">End</span>
                <p className="mt-1 text-gray-700">
                  {new Date(event.endDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-500">Venue</span>
              <p className="mt-1 text-gray-700">{event.venue}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Location</span>
              <p className="mt-1 text-gray-700">
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
                  <tr className="border-b border-gray-200 text-left text-gray-500">
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
                    <tr key={tt.id} className="border-b border-gray-100">
                      <td className="py-3 font-medium text-gray-900">{tt.name}</td>
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

        {/* Homepage Banner Management */}
        {event.status === 'PUBLISHED' && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Homepage Banner</CardTitle>
            </CardHeader>
            <CardContent>
              {event.showOnHomeBanner ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
                    <span className="font-medium">Banner is ACTIVE</span> — Your event is showing on the homepage carousel
                  </div>
                  {event.homeBannerUrl && (
                    <div className="rounded-md overflow-hidden border border-gray-200">
                      <img src={event.homeBannerUrl} alt="Banner preview" className="w-full h-40 object-cover" />
                    </div>
                  )}
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Title:</span> {event.homeBannerTitle || event.title}
                  </p>
                  <p className="text-sm text-gray-600">
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
                  <p className="text-sm text-gray-500">
                    Show this event on the homepage banner carousel. Available for <span className="font-medium text-orange-600">PREMIUM</span> and <span className="font-medium text-orange-600">ENTERPRISE</span> plans.
                  </p>
                  {bannerMsg && (
                    <div className={`rounded-md p-2 text-sm ${bannerMsg.includes('Failed') || bannerMsg.includes('only') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                      {bannerMsg}
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Banner Image URL *</label>
                      <input
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="https://example.com/banner.jpg (1200x500 recommended)"
                        value={bannerForm.url}
                        onChange={(e) => setBannerForm({ ...bannerForm, url: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Banner Title (optional)</label>
                      <input
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Custom title for the banner (defaults to event title)"
                        value={bannerForm.title}
                        onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">Banner Description (optional)</label>
                      <input
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Short tagline for the banner"
                        value={bannerForm.desc}
                        onChange={(e) => setBannerForm({ ...bannerForm, desc: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white"
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
