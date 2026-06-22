'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface PendingOrganiser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  orgName: string | null;
  orgDescription: string | null;
  idDocumentType: string | null;
  profileCompleted: boolean;
  createdAt: string;
}

interface PendingEvent {
  id: string;
  title: string;
  slug: string;
  venue: string;
  city: string;
  startDate: string;
  category: { name: string };
  organiser: { firstName: string; lastName: string; orgName: string | null; email: string };
  ticketTypes: { name: string; price: number; totalQty: number }[];
}

export default function ApprovalsPage() {
  const [organisers, setOrganisers] = useState<PendingOrganiser[]>([]);
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const fetchApprovals = async () => {
    try {
      const res = await apiClient.get('/admin/approvals');
      setOrganisers(res.data.data.pendingOrganisers);
      setEvents(res.data.data.pendingEvents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApprovals(); }, []);

  const handleUserAction = async (userId: string, status: 'ACTIVE' | 'REJECTED') => {
    setActionLoading(userId);
    try {
      await apiClient.patch(`/admin/users/${userId}/status`, {
        status,
        reason: status === 'REJECTED' ? rejectReason[userId] : undefined,
      });
      setOrganisers((prev) => prev.filter((o) => o.id !== userId));
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEventAction = async (eventId: string, action: 'APPROVED' | 'REJECTED') => {
    setActionLoading(eventId);
    try {
      await apiClient.post(`/admin/events/${eventId}/review`, {
        action,
        reason: action === 'REJECTED' ? rejectReason[eventId] : undefined,
      });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}</div>;
  }

  const totalPending = organisers.length + events.length;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Pending Approvals</h1>

      {totalPending === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-gray-500 dark:text-gray-400">No pending approvals</p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">All caught up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Pending Organisers */}
          {organisers.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                Organiser Registrations ({organisers.length})
              </h2>
              <div className="space-y-3">
                {organisers.map((org) => (
                  <Card key={org.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {org.firstName} {org.lastName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 break-all">{org.email}</p>
                          {org.phone && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{org.phone}</p>
                          )}
                          {org.orgName && (
                            <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                              <span className="font-medium">Org:</span> {org.orgName}
                            </p>
                          )}
                          {org.orgDescription && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{org.orgDescription}</p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
                            <span>Registered: {new Date(org.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                            {org.idDocumentType && <span>ID: {org.idDocumentType}</span>}
                            <span>{org.profileCompleted ? 'Profile complete' : 'Profile incomplete'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUserAction(org.id, 'ACTIVE')}
                              disabled={actionLoading === org.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUserAction(org.id, 'REJECTED')}
                              disabled={actionLoading === org.id}
                            >
                              Reject
                            </Button>
                          </div>
                          <input
                            type="text"
                            placeholder="Rejection reason (optional)"
                            className="w-full sm:w-56 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-xs"
                            value={rejectReason[org.id] || ''}
                            onChange={(e) => setRejectReason((prev) => ({ ...prev, [org.id]: e.target.value }))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Pending Events */}
          {events.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                Event Submissions ({events.length})
              </h2>
              <div className="space-y-3">
                {events.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{event.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {event.category.name} &middot; {event.venue}, {event.city}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(event.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 break-all">
                            <span className="font-medium">By:</span>{' '}
                            {event.organiser.orgName || `${event.organiser.firstName} ${event.organiser.lastName}`}{' '}
                            ({event.organiser.email})
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {event.ticketTypes.map((tt) => (
                              <span key={tt.name} className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                                {tt.name}: ₹{Number(tt.price)} x{tt.totalQty}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end sm:ml-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleEventAction(event.id, 'APPROVED')}
                              disabled={actionLoading === event.id}
                            >
                              Publish
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleEventAction(event.id, 'REJECTED')}
                              disabled={actionLoading === event.id}
                            >
                              Reject
                            </Button>
                          </div>
                          <input
                            type="text"
                            placeholder="Rejection reason (optional)"
                            className="w-full sm:w-56 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-xs"
                            value={rejectReason[event.id] || ''}
                            onChange={(e) => setRejectReason((prev) => ({ ...prev, [event.id]: e.target.value }))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
