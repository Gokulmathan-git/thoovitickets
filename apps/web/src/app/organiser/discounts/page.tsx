'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Plus, Pencil, Trash2, Mail, Ticket, X, Send, Copy, Check } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  ticketTypes: TicketTier[];
}

interface TicketTier {
  id: string;
  name: string;
  price: number;
}

interface Discount {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  startDate: string;
  endDate: string;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  isPublic: boolean;
  ticketTierIds: string[];
  event: {
    id: string;
    title: string;
  };
}

interface DiscountForm {
  eventId: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: string;
  ticketTierIds: string[];
  startDate: string;
  endDate: string;
  maxUses: string;
  isPublic: boolean;
}

interface EmailForm {
  recipients: string;
  subject: string;
  message: string;
}

const emptyForm: DiscountForm = {
  eventId: '',
  code: '',
  discountType: 'PERCENTAGE',
  value: '',
  ticketTierIds: [],
  startDate: '',
  endDate: '',
  maxUses: '',
  isPublic: false,
};

const emptyEmailForm: EmailForm = {
  recipients: '',
  subject: '',
  message: '',
};

export default function OrganiserDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEventId, setFilterEventId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DiscountForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventTiers, setSelectedEventTiers] = useState<TicketTier[]>([]);
  const [emailDiscountId, setEmailDiscountId] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState<EmailForm>(emptyEmailForm);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterEventId ? `/discounts?eventId=${filterEventId}` : '/discounts';
      const res = await apiClient.get(url);
      setDiscounts(res.data.data || []);
    } catch {
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  }, [filterEventId]);

  const fetchEvents = async () => {
    try {
      const res = await apiClient.get('/events/my');
      setEvents(res.data.data || []);
    } catch {
      setEvents([]);
    }
  };

  useEffect(() => { fetchEvents(); }, []);
  useEffect(() => { fetchDiscounts(); }, [fetchDiscounts]);

  // Load ticket tiers when event changes in form
  useEffect(() => {
    if (!form.eventId) {
      setSelectedEventTiers([]);
      return;
    }
    const event = events.find((e) => e.id === form.eventId);
    if (event?.ticketTypes) {
      setSelectedEventTiers(event.ticketTypes);
    } else {
      // Fetch event details to get ticket types
      apiClient.get(`/events/${form.eventId}`).then((res) => {
        const eventData = res.data.data;
        setSelectedEventTiers(eventData?.ticketTypes || []);
      }).catch(() => setSelectedEventTiers([]));
    }
  }, [form.eventId, events]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  };

  const handleOpenEdit = (discount: Discount) => {
    setEditingId(discount.id);
    setForm({
      eventId: discount.event.id,
      code: discount.code,
      discountType: discount.discountType,
      value: String(discount.value),
      ticketTierIds: discount.ticketTierIds || [],
      startDate: discount.startDate ? discount.startDate.slice(0, 16) : '',
      endDate: discount.endDate ? discount.endDate.slice(0, 16) : '',
      maxUses: discount.maxUses ? String(discount.maxUses) : '',
      isPublic: discount.isPublic,
    });
    setShowForm(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.eventId || !form.code || !form.value) {
      setError('Please fill in all required fields');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        eventId: form.eventId,
        code: form.code.toUpperCase(),
        discountType: form.discountType,
        value: Number(form.value),
        ticketTierIds: form.ticketTierIds.length > 0 ? form.ticketTierIds : undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        isPublic: form.isPublic,
      };
      if (editingId) {
        await apiClient.patch(`/discounts/${editingId}`, payload);
      } else {
        await apiClient.post('/discounts', payload);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      fetchDiscounts();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to save discount');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (discount: Discount) => {
    if (!confirm(`Deactivate discount "${discount.code}"?`)) return;
    setActionLoading(discount.id);
    try {
      await apiClient.patch(`/discounts/${discount.id}`, { isActive: false });
      fetchDiscounts();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to deactivate discount');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendEmail = async () => {
    if (!emailDiscountId || !emailForm.recipients || !emailForm.subject || !emailForm.message) return;
    setSendingEmail(true);
    try {
      await apiClient.post(`/discounts/${emailDiscountId}/send-email`, {
        recipients: emailForm.recipients.split(',').map((e) => e.trim()).filter(Boolean),
        subject: emailForm.subject,
        message: emailForm.message,
      });
      setEmailDiscountId(null);
      setEmailForm(emptyEmailForm);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyCode = (discount: Discount) => {
    navigator.clipboard.writeText(discount.code);
    setCopiedId(discount.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleTier = (tierId: string) => {
    setForm((prev) => ({
      ...prev,
      ticketTierIds: prev.ticketTierIds.includes(tierId)
        ? prev.ticketTierIds.filter((id) => id !== tierId)
        : [...prev.ticketTierIds, tierId],
    }));
  };

  const isExpired = (d: Discount) => d.endDate && new Date(d.endDate) < new Date();
  const isUpcoming = (d: Discount) => d.startDate && new Date(d.startDate) > new Date();

  const getStatusBadge = (discount: Discount) => {
    if (!discount.isActive) return { label: 'Inactive', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' };
    if (isExpired(discount)) return { label: 'Expired', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
    if (isUpcoming(discount)) return { label: 'Upcoming', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' };
    return { label: 'Active', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Discount Codes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create and manage discount codes for your events</p>
        </div>
        <Button onClick={handleOpenCreate} className="self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" /> Create Discount
        </Button>
      </div>

      {/* Filter by event */}
      <div className="mb-4">
        <select
          value={filterEventId}
          onChange={(e) => setFilterEventId(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All Events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>{event.title}</option>
          ))}
        </select>
      </div>

      {/* Error banner */}
      {error && !showForm && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Discount list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : discounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">No discount codes yet</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Create your first discount code to offer deals on your events</p>
            <Button onClick={handleOpenCreate} className="mt-4">
              Create First Discount
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {discounts.map((discount) => {
            const status = getStatusBadge(discount);
            return (
              <Card key={discount.id} className={cn(!discount.isActive && 'opacity-60')}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <button
                          onClick={() => handleCopyCode(discount)}
                          className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-gray-700 px-2.5 py-1 font-mono text-sm font-bold text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          title="Copy code"
                        >
                          {discount.code}
                          {copiedId === discount.id ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </button>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', status.color)}>
                          {status.label}
                        </span>
                        {discount.isPublic && (
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400">
                            Public
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {discount.event.title}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          {discount.discountType === 'PERCENTAGE' ? `${discount.value}% off` : `₹${discount.value} off`}
                        </span>
                        <span>
                          {formatDate(discount.startDate)} — {formatDate(discount.endDate)}
                        </span>
                        <span>
                          Used: {discount.usedCount}{discount.maxUses ? ` / ${discount.maxUses}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenEdit(discount)}
                        disabled={actionLoading === discount.id}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEmailDiscountId(discount.id);
                          setEmailForm({
                            ...emptyEmailForm,
                            subject: `Discount Code: ${discount.code}`,
                            message: `Use discount code ${discount.code} to get ${discount.discountType === 'PERCENTAGE' ? `${discount.value}%` : `₹${discount.value}`} off on "${discount.event.title}"!`,
                          });
                        }}
                        disabled={actionLoading === discount.id}
                        title="Send Email"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      {discount.isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeactivate(discount)}
                          disabled={actionLoading === discount.id}
                          className="text-red-600 dark:text-red-400"
                          title="Deactivate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4">
          <div className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editingId ? 'Edit Discount' : 'Create Discount'}
              </h2>
              <button onClick={() => { setShowForm(false); setError(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
            )}

            <div className="space-y-4">
              {/* Event selector */}
              <div className="space-y-2">
                <Label>Event *</Label>
                <select
                  value={form.eventId}
                  onChange={(e) => setForm({ ...form, eventId: e.target.value, ticketTierIds: [] })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">Select an event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
              </div>

              {/* Discount code */}
              <div className="space-y-2">
                <Label>Discount Code *</Label>
                <Input
                  placeholder="e.g. SUMMER25"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="uppercase"
                />
              </div>

              {/* Discount type + value */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, discountType: 'PERCENTAGE' })}
                      className={cn(
                        'flex-1 py-2 text-sm font-medium transition-colors',
                        form.discountType === 'PERCENTAGE'
                          ? 'bg-orange-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
                      )}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, discountType: 'FIXED' })}
                      className={cn(
                        'flex-1 py-2 text-sm font-medium transition-colors',
                        form.discountType === 'FIXED'
                          ? 'bg-orange-500 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
                      )}
                    >
                      Fixed
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Value *</Label>
                  <Input
                    type="number"
                    placeholder={form.discountType === 'PERCENTAGE' ? 'e.g. 25' : 'e.g. 500'}
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    min="0"
                    max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                  />
                </div>
              </div>

              {/* Ticket tier multi-select */}
              {selectedEventTiers.length > 0 && (
                <div className="space-y-2">
                  <Label>Ticket Tiers <span className="text-xs text-gray-400">(leave empty for all tiers)</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedEventTiers.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => toggleTier(tier.id)}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
                          form.ticketTierIds.includes(tier.id)
                            ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
                        )}
                      >
                        {tier.name} (₹{tier.price})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Max uses */}
              <div className="space-y-2">
                <Label>Max Uses <span className="text-xs text-gray-400">(leave empty for unlimited)</span></Label>
                <Input
                  type="number"
                  placeholder="Unlimited"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  min="1"
                />
              </div>

              {/* Public toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isPublic: !form.isPublic })}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    form.isPublic ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      form.isPublic ? 'translate-x-6' : 'translate-x-1',
                    )}
                  />
                </button>
                <Label className="cursor-pointer" onClick={() => setForm({ ...form, isPublic: !form.isPublic })}>
                  Public discount <span className="text-xs text-gray-400">(visible to all customers)</span>
                </Label>
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); setError(null); }}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form.eventId || !form.code || !form.value}
              >
                {saving ? 'Saving...' : editingId ? 'Update Discount' : 'Create Discount'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {emailDiscountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Send Discount Code</h2>
              <button onClick={() => { setEmailDiscountId(null); setEmailForm(emptyEmailForm); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Recipient Emails <span className="text-xs text-gray-400">(comma-separated)</span></Label>
                <Input
                  type="text"
                  placeholder="user1@email.com, user2@email.com"
                  value={emailForm.recipients}
                  onChange={(e) => setEmailForm({ ...emailForm, recipients: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <textarea
                  rows={4}
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setEmailDiscountId(null); setEmailForm(emptyEmailForm); }}>Cancel</Button>
              <Button
                onClick={handleSendEmail}
                disabled={sendingEmail || !emailForm.recipients || !emailForm.subject || !emailForm.message}
              >
                <Send className="mr-2 h-4 w-4" />
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
