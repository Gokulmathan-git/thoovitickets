'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Eye, X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface PendingOrganiser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  orgName: string | null;
  orgDescription: string | null;
  idDocumentType: string | null;
  aadharDocumentUrl: string | null;
  panDocumentUrl: string | null;
  emailVerified: boolean;
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

interface PendingAction {
  id: string;
  type: string;
  reason: string | null;
  createdAt: string;
  requester: { id: string; firstName: string; lastName: string; email: string; phone: string | null; orgName: string | null };
  event: { id: string; title: string; venue: string; startDate: string; status: string } | null;
}

export default function ApprovalsPage() {
  const [organisers, setOrganisers] = useState<PendingOrganiser[]>([]);
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [docPreview, setDocPreview] = useState<{ url: string; label: string } | null>(null);
  const [docLoading, setDocLoading] = useState<string | null>(null);

  const fetchApprovals = async () => {
    try {
      const res = await apiClient.get('/admin/approvals');
      setOrganisers(res.data.data.pendingOrganisers);
      setEvents(res.data.data.pendingEvents);
      setPendingActions(res.data.data.pendingActions || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApprovals(); }, []);

  const viewDocument = async (docPath: string, label: string) => {
    setDocLoading(docPath);
    try {
      const res = await apiClient.get(`/upload/document-url?path=${encodeURIComponent(docPath)}`);
      setDocPreview({ url: res.data.data.url, label });
    } catch {
      alert('Failed to load document');
    } finally {
      setDocLoading(null);
    }
  };

  const handleUserAction = async (userId: string, status: 'ACTIVE' | 'REJECTED') => {
    if (status === 'REJECTED' && !rejectReason[userId]?.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
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

  const handleActionReview = async (approvalId: string, action: 'APPROVED' | 'REJECTED') => {
    setActionLoading(approvalId);
    try {
      await apiClient.post(`/admin/approvals/${approvalId}/review`, {
        action,
        reason: action === 'REJECTED' ? rejectReason[approvalId] : undefined,
      });
      setPendingActions((prev) => prev.filter((a) => a.id !== approvalId));
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

  const totalPending = organisers.length + events.length + pendingActions.length;

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
                      <div className="flex flex-col gap-4">
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
                              <span className={org.emailVerified ? 'text-green-600' : 'text-red-500'}>
                                Email: {org.emailVerified ? 'Verified' : 'Not verified'}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:items-end">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUserAction(org.id, 'ACTIVE')}
                                disabled={actionLoading === org.id || !org.profileCompleted}
                                title={!org.profileCompleted ? 'Profile is incomplete — cannot approve yet' : undefined}
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
                              placeholder="Rejection reason (required to reject)"
                              className="w-full sm:w-64 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-xs"
                              value={rejectReason[org.id] || ''}
                              onChange={(e) => setRejectReason((prev) => ({ ...prev, [org.id]: e.target.value }))}
                            />
                          </div>
                        </div>

                        {/* KYC Documents Section */}
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            KYC Documents
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <DocumentBadge
                              label="Aadhaar Card"
                              path={org.aadharDocumentUrl}
                              loading={docLoading}
                              onView={(path) => viewDocument(path, `${org.firstName} ${org.lastName} — Aadhaar`)}
                            />
                            <DocumentBadge
                              label="PAN Card"
                              path={org.panDocumentUrl}
                              loading={docLoading}
                              onView={(path) => viewDocument(path, `${org.firstName} ${org.lastName} — PAN`)}
                            />
                          </div>
                          {!org.profileCompleted && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Profile incomplete — organiser has not uploaded all required documents yet
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Pending Actions (Reactivation / Re-approval requests) */}
          {pendingActions.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                Pending Requests ({pendingActions.length})
              </h2>
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <Card key={action.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                              {action.type === 'USER_REACTIVATION' ? 'Reactivation' : action.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                            {action.requester.firstName} {action.requester.lastName}
                            {action.requester.orgName && <span className="font-normal text-gray-500"> ({action.requester.orgName})</span>}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 break-all">{action.requester.email}</p>
                          {action.reason && (
                            <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-2">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Reason:</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{action.reason}</p>
                            </div>
                          )}
                          {action.event && (
                            <p className="mt-1 text-sm text-gray-500">
                              Event: {action.event.title} — {new Date(action.event.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            Requested: {new Date(action.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:items-end">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleActionReview(action.id, 'APPROVED')}
                              disabled={actionLoading === action.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleActionReview(action.id, 'REJECTED')}
                              disabled={actionLoading === action.id}
                            >
                              Reject
                            </Button>
                          </div>
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            className="w-full sm:w-56 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 text-xs"
                            value={rejectReason[action.id] || ''}
                            onChange={(e) => setRejectReason((prev) => ({ ...prev, [action.id]: e.target.value }))}
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

      {/* Document Preview Modal */}
      {docPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDocPreview(null)}>
          <div className="relative max-h-[90vh] max-w-3xl w-full rounded-xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{docPreview.label}</p>
              <button onClick={() => setDocPreview(null)} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex items-center justify-center overflow-auto p-4" style={{ maxHeight: 'calc(90vh - 56px)' }}>
              {docPreview.url.endsWith('.pdf') ? (
                <iframe src={docPreview.url} className="h-[70vh] w-full rounded border" />
              ) : (
                <img src={docPreview.url} alt={docPreview.label} className="max-h-[70vh] max-w-full rounded object-contain" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentBadge({
  label,
  path,
  loading,
  onView,
}: {
  label: string;
  path: string | null;
  loading: string | null;
  onView: (path: string) => void;
}) {
  if (!path) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2">
        <XCircle className="h-4 w-4 shrink-0 text-red-500" />
        <span className="text-sm text-red-700 dark:text-red-400">{label}: Not uploaded</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
        <span className="text-sm text-green-700 dark:text-green-400">{label}: Uploaded</span>
      </div>
      <button
        onClick={() => onView(path)}
        disabled={loading === path}
        className="flex items-center gap-1 rounded-md bg-white dark:bg-gray-800 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 disabled:opacity-50"
      >
        <Eye className="h-3.5 w-3.5" />
        {loading === path ? 'Loading...' : 'View'}
      </button>
    </div>
  );
}
