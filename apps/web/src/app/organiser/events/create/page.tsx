'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventBaseSchema, type CreateEventFormValues, type EventCategoryResponse } from '@thoovitickets/shared';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { CategorySelect } from '@/components/ui/category-select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Shield, Globe, Clock, Sparkles, AlertTriangle, X, Lock, ArrowUpCircle } from 'lucide-react';
import { MapPicker } from '@/components/events/map-picker';
import { AiDescriptionGenerator } from '@/components/ai/ai-description-generator';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

const TIMEZONES = [
  { value: 'Pacific/Midway', label: 'Pacific/Midway (SST, -11:00)' },
  { value: 'Pacific/Honolulu', label: 'Pacific/Honolulu (HST, -10:00)' },
  { value: 'America/Anchorage', label: 'America/Anchorage (AKST, -09:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST, -08:00)' },
  { value: 'America/Denver', label: 'America/Denver (MST, -07:00)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST, -06:00)' },
  { value: 'America/New_York', label: 'America/New_York (EST, -05:00)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT, -03:00)' },
  { value: 'Atlantic/Azores', label: 'Atlantic/Azores (AZOT, -01:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT, +00:00)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET, +01:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET, +01:00)' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo (EET, +02:00)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST, +03:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, +04:00)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT, +05:00)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, +05:30)' },
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (BST, +06:00)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT, +07:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, +08:00)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST, +08:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, +09:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST, +10:00)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST, +12:00)' },
];

function getLocalTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TIMEZONES.find(t => t.value === tz)) return tz;
  } catch {}
  return 'Asia/Kolkata';
}

function toLocalDatetimeString(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date).replace(' ', 'T');
}

function localInputToUTC(localValue: string, timezone: string): string {
  const dateInTz = new Date(localValue);
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = utcFormatter.formatToParts(dateInTz);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  const localISOStr = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
  const tzOffset = dateInTz.getTime() - new Date(localISOStr).getTime();
  const utcDate = new Date(dateInTz.getTime() + tzOffset);
  return utcDate.toISOString();
}

function getMinStartDate(timezone: string): string {
  const now = new Date();
  const minDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  return toLocalDatetimeString(minDate, timezone);
}

function getNowString(timezone: string): string {
  return toLocalDatetimeString(new Date(), timezone);
}

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<EventCategoryResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [planUsage, setPlanUsage] = useState<{
    events: { used: number; max: number };
    ticketTiers: { max: number };
    ticketsPerEvent: { max: number };
    tier: string;
  } | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [eventImageUrl, setEventImageUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(getLocalTimezone);
  const [startDateLocal, setStartDateLocal] = useState('');
  const [endDateLocal, setEndDateLocal] = useState('');
  const [ticketSaleEndLocals, setTicketSaleEndLocals] = useState<Record<number, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventBaseSchema),
    defaultValues: {
      country: 'India',
      tags: [],
      timezone: getLocalTimezone(),
      ticketTypes: [
        { name: 'General', price: 0, totalQty: 100, maxPerOrder: 5, currency: 'INR' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ticketTypes',
  });

  const [orgProducts, setOrgProducts] = useState<any[]>([]);
  const [ticketGoodies, setTicketGoodies] = useState<Record<number, string[]>>({});

  useEffect(() => {
    apiClient.get('/categories').then((res) => setCategories(res.data.data));
    apiClient.get('/subscriptions/usage')
      .then((res) => setPlanUsage(res.data.data))
      .finally(() => setPlanLoading(false));
    apiClient.get('/products').then((res) => setOrgProducts(res.data.data || [])).catch(() => {});
  }, []);

  const [minStartDate] = useState(() => getMinStartDate(selectedTimezone));
  const [nowString] = useState(() => getNowString(selectedTimezone));

  const minEndDate = useMemo(() => {
    if (!startDateLocal) return minStartDate;
    const threeHoursAfter = new Date(new Date(startDateLocal).getTime() + 3 * 60 * 60 * 1000);
    return toLocalDatetimeString(threeHoursAfter, selectedTimezone);
  }, [startDateLocal, selectedTimezone, minStartDate]);

  const maxTicketSaleEnd = useMemo(() => {
    if (!startDateLocal) return '';
    const eventStart = new Date(startDateLocal);
    const oneDayBefore = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
    return toLocalDatetimeString(oneDayBefore, selectedTimezone);
  }, [startDateLocal, selectedTimezone]);

  const handleStartDateChange = (value: string) => {
    setStartDateLocal(value);
    if (value) {
      setValue('startDate', localInputToUTC(value, selectedTimezone), { shouldValidate: true });

      const oneDayBefore = new Date(new Date(value).getTime() - 24 * 60 * 60 * 1000);
      const saleEndDefault = toLocalDatetimeString(oneDayBefore, selectedTimezone);
      const newLocals: Record<number, string> = {};
      fields.forEach((_, i) => {
        newLocals[i] = saleEndDefault;
        setValue(`ticketTypes.${i}.saleEnd`, localInputToUTC(saleEndDefault, selectedTimezone));
      });
      setTicketSaleEndLocals(newLocals);
    }
    if (endDateLocal && value) {
      const threeHoursAfter = new Date(new Date(value).getTime() + 3 * 60 * 60 * 1000);
      if (new Date(endDateLocal) < threeHoursAfter) {
        setEndDateLocal('');
        setValue('endDate', '', { shouldValidate: false });
      }
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDateLocal(value);
    if (value) {
      setValue('endDate', localInputToUTC(value, selectedTimezone), { shouldValidate: true });
    }
  };

  const handleTimezoneChange = (tz: string) => {
    setSelectedTimezone(tz);
    setValue('timezone', tz);
    if (startDateLocal) {
      setValue('startDate', localInputToUTC(startDateLocal, tz), { shouldValidate: true });
    }
    if (endDateLocal) {
      setValue('endDate', localInputToUTC(endDateLocal, tz), { shouldValidate: true });
    }
  };

  const onSubmit = async (data: CreateEventFormValues) => {
    setError(null);
    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      const ticketTypes = data.ticketTypes.map((t: any, idx: number) => {
        const ticket = { ...t };
        if (ticket.saleStartNow) {
          ticket.saleStart = new Date().toISOString();
        }
        delete ticket.saleStartNow;
        if (ticketGoodies[idx]?.length) {
          ticket.goodieProductIds = ticketGoodies[idx];
        }
        return ticket;
      });

      const payload = { ...data, ticketTypes, latitude, longitude, imageUrl: eventImageUrl, bannerUrl };
      const res = await apiClient.post('/events', payload);
      const event = res.data.data;
      router.push(`/organiser/events/${event.id}/edit`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string; details?: string[] } } } };
      const details = axiosError.response?.data?.error?.details;
      const msg = Array.isArray(details) ? details.join(', ') : axiosError.response?.data?.error?.message || 'Failed to create event';
      setError(msg);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldLabels: Record<string, string> = {
    title: 'Event Title',
    description: 'Description',
    categoryId: 'Category',
    startDate: 'Start Date & Time',
    endDate: 'End Date & Time',
    venue: 'Venue',
    city: 'City',
    country: 'Country',
    ticketTypes: 'Ticket Types',
  };

  const onInvalid = (fieldErrors: Record<string, any>) => {
    const messages: string[] = [];
    for (const [key, err] of Object.entries(fieldErrors)) {
      if (key === 'ticketTypes' && Array.isArray(err)) {
        err.forEach((ticketErr: any, i: number) => {
          if (!ticketErr) return;
          Object.entries(ticketErr).forEach(([field, e]: [string, any]) => {
            if (e?.message) messages.push(`Ticket #${i + 1} ${field}: ${e.message}`);
          });
        });
      } else if ((err as any)?.message) {
        messages.push(`${fieldLabels[key] || key}: ${(err as any).message}`);
      }
    }
    setValidationErrors(messages);

    const firstKey = Object.keys(fieldErrors)[0];
    if (firstKey) {
      const el = document.getElementById(firstKey) || document.querySelector(`[name="${firstKey}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (el as HTMLElement).focus?.();
      }
    }

    setTimeout(() => setValidationErrors([]), 8000);
  };

  const profileCompleted = (user as any)?.profileCompleted;

  if (planLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  if (planUsage && planUsage.events.used >= planUsage.events.max) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Create New Event</h1>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Lock className="h-8 w-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Event Limit Reached</h2>
              <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
                You&apos;ve used <strong>{planUsage.events.used}/{planUsage.events.max} events</strong> this month on your <strong>{planUsage.tier}</strong> plan.
                Upgrade your subscription to create more events.
              </p>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-gray-400">Events Used</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{planUsage.events.used} / {planUsage.events.max}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Max Ticket Tiers</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{planUsage.ticketTiers.max}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Max Tickets/Event</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{planUsage.ticketsPerEvent.max}</p>
                  </div>
                </div>
              </div>
              <Link href="/organiser/subscriptions">
                <Button className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                  <ArrowUpCircle className="mr-2 h-4 w-4" /> Upgrade Plan
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user && !profileCompleted) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Create New Event</h1>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Complete Your Profile First</h2>
              <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
                Before creating events, you need to complete your profile: upload a profile photo, verify your email, and submit your Aadhar or PAN card.
              </p>
              <Link href="/profile">
                <Button className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                  Go to Profile
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
          <Sparkles className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Event</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Fill in the details to create your event</p>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div style={{ animation: 'fade-in-up 0.3s ease-out' }} className="fixed top-20 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-red-100 dark:border-red-900 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">Please fix the following</p>
            </div>
            <button onClick={() => setValidationErrors([])} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto px-4 py-3 space-y-1.5">
            {validationErrors.map((msg, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {planUsage && (
        <div className="rounded-xl border border-orange-200/60 dark:border-orange-800/30 bg-orange-50/50 dark:bg-orange-900/10 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-bold text-orange-700 dark:text-orange-400">{planUsage.tier}</span>
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Events: <strong className="text-gray-700 dark:text-gray-200">{planUsage.events.used}/{planUsage.events.max}</strong> this month
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Ticket tiers: <strong className="text-gray-700 dark:text-gray-200">max {planUsage.ticketTiers.max}</strong>
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Tickets/event: <strong className="text-gray-700 dark:text-gray-200">max {planUsage.ticketsPerEvent.max}</strong>
              </span>
            </div>
            {planUsage.tier === 'FREE' && (
              <Link href="/organiser/subscriptions" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
                Upgrade for more →
              </Link>
            )}
          </div>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input id="title" placeholder="e.g. Summer Music Festival 2026" maxLength={200} error={errors.title?.message} {...register('title')} />
            </div>

            {/* Event Date & Time — right below title */}
            <div className="rounded-xl border border-orange-200/60 dark:border-orange-800/30 bg-orange-50/30 dark:bg-orange-900/10 p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Event Date & Time</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="startDate">Start Date & Time *</Label>
                  <input
                    id="startDate"
                    type="datetime-local"
                    value={startDateLocal}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && new Date(val) < new Date(minStartDate)) {
                        setError('Start date must be at least 2 days from now');
                        return;
                      }
                      setError(null);
                      handleStartDateChange(val);
                    }}
                    className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:text-gray-100"
                  />
                  {errors.startDate && <p className="text-xs text-red-600 dark:text-red-400">{errors.startDate.message}</p>}
                  <p className="text-xs text-gray-400">Earliest: 2 days from now</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="endDate">End Date & Time *</Label>
                  <input
                    id="endDate"
                    type="datetime-local"
                    value={endDateLocal}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && startDateLocal && new Date(val) < new Date(new Date(startDateLocal).getTime() + 3 * 60 * 60 * 1000)) {
                        setError('End date must be at least 3 hours after start date');
                        return;
                      }
                      setError(null);
                      handleEndDateChange(val);
                    }}
                    disabled={!startDateLocal}
                    className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:text-gray-100 disabled:opacity-50"
                  />
                  {errors.endDate && <p className="text-xs text-red-600 dark:text-red-400">{errors.endDate.message}</p>}
                  {!startDateLocal ? (
                    <p className="text-xs text-gray-400">Set start date first</p>
                  ) : (
                    <p className="text-xs text-gray-400">Min 3 hours after start</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-gray-400" />
                  <Label htmlFor="timezone" className="text-xs">Timezone</Label>
                </div>
                <select
                  id="timezone"
                  value={selectedTimezone}
                  onChange={(e) => handleTimezoneChange(e.target.value)}
                  className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-100"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">Auto-detected from your browser. All times saved in UTC.</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description *</Label>
                <span className={`text-xs ${(watch('description')?.length || 0) > 1000 ? 'text-red-500' : 'text-gray-400'}`}>
                  {watch('description')?.length || 0}/1000
                </span>
              </div>
              <textarea
                id="description"
                rows={4}
                maxLength={1000}
                placeholder="Describe your event in detail (min 20 characters, max 1000)"
                className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:text-gray-100"
                {...register('description')}
              />
              {errors.description && <p className="text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>}
              <AiDescriptionGenerator
                title={watch('title') || ''}
                category={categories.find(c => c.id === watch('categoryId'))?.name || ''}
                venue={watch('venue') || ''}
                city={watch('city') || ''}
                startDate={watch('startDate') || ''}
                endDate={watch('endDate')}
                onApply={(data) => {
                  setValue('description', data.description, { shouldValidate: true });
                  if (data.tags?.length) setValue('tags', data.tags);
                }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <CategorySelect
                  id="categoryId"
                  categories={categories}
                  value={watch('categoryId') || ''}
                  onChange={(val) => setValue('categoryId', val, { shouldValidate: true })}
                  error={errors.categoryId?.message}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" placeholder="e.g. outdoor, live-music, family" maxLength={50} {...register('tags', {
                  setValueAs: (v: string) => typeof v === 'string' ? v.split(',').map(t => t.trim()).filter(Boolean) : v,
                })} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Image */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Event Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Recommended: 1280 x 720px (16:9 landscape)</p>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5">This size displays best on the home page and event detail page. Avoid portrait/vertical images.</p>
            </div>
            {eventImageUrl ? (
              <div className="relative">
                <img src={eventImageUrl} alt="Event" className="aspect-video w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setEventImageUrl(null)}
                  className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 transition-colors hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                <Plus className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {uploadingImage ? 'Uploading...' : 'Click to upload event image'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG or WebP. Max 5MB. Best at 1280x720px.</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      setError('Image must be under 5MB');
                      return;
                    }
                    setUploadingImage(true);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await apiClient.post('/upload/event', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      setEventImageUrl(res.data.data.url);
                    } catch {
                      setError('Failed to upload image');
                    } finally {
                      setUploadingImage(false);
                    }
                  }}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Event Banner (Detail Page) */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Event Banner (Detail Page)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Recommended: 1920 x 460px (wide landscape)</p>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5">This wide banner shows at the top of your event detail page. Use a landscape/horizontal image.</p>
            </div>
            {bannerUrl ? (
              <div className="relative">
                <img src={bannerUrl} alt="Banner" className="w-full rounded-lg object-cover" style={{ aspectRatio: '1920/460' }} />
                <button
                  type="button"
                  onClick={() => setBannerUrl(null)}
                  className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 transition-colors hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                <Plus className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {uploadingBanner ? 'Uploading...' : 'Click to upload banner image'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG or WebP. Max 5MB. Best at 1920x460px.</p>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingBanner}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      setError('Image must be under 5MB');
                      return;
                    }
                    setUploadingBanner(true);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await apiClient.post('/upload/event', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      setBannerUrl(res.data.data.url);
                    } catch {
                      setError('Failed to upload banner');
                    } finally {
                      setUploadingBanner(false);
                    }
                  }}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue *</Label>
                <Input id="venue" placeholder="e.g. Convention Center" maxLength={200} error={errors.venue?.message} {...register('venue')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Full street address" maxLength={300} {...register('address')} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" placeholder="e.g. Chennai" maxLength={100} error={errors.city?.message} {...register('city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" placeholder="e.g. Tamil Nadu" maxLength={100} {...register('state')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAttendees">Max Attendees</Label>
                <Input id="maxAttendees" type="number" placeholder="Optional" {...register('maxAttendees', { setValueAs: (v: string) => v === '' || v === undefined ? undefined : Number(v) })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Event Location on Map</Label>
              <MapPicker
                latitude={latitude}
                longitude={longitude}
                onLocationSelect={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
                address={watch('venue')}
                city={watch('city')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ticket Types */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Ticket Types</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', price: 0, totalQty: 50, maxPerOrder: 5, currency: 'INR' })}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Ticket Type
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.ticketTypes && typeof errors.ticketTypes.message === 'string' && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.ticketTypes.message}</p>
            )}

            {fields.map((field, index) => {
              const saleStartNow = watch(`ticketTypes.${index}.saleStartNow` as any);

              return (
                <div key={field.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Ticket #{index + 1}</span>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <Label>Name *</Label>
                      <Input placeholder="e.g. General, VIP" maxLength={100} error={errors.ticketTypes?.[index]?.name?.message} {...register(`ticketTypes.${index}.name`)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Price (₹) *</Label>
                      <Input type="number" step="0.01" min="0" error={errors.ticketTypes?.[index]?.price?.message} {...register(`ticketTypes.${index}.price`, { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Total Qty *</Label>
                      <Input type="number" min="1" error={errors.ticketTypes?.[index]?.totalQty?.message} {...register(`ticketTypes.${index}.totalQty`, { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Max Per Order</Label>
                      <Input type="number" min="1" max="50" {...register(`ticketTypes.${index}.maxPerOrder`, { valueAsNumber: true })} />
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <Label>Description</Label>
                    <Input placeholder="What's included in this ticket?" maxLength={300} {...register(`ticketTypes.${index}.description`)} />
                  </div>

                  {/* Ticket Sale Dates */}
                  <div className="mt-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Ticket Sale Period</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Sale Start</Label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={saleStartNow ?? true}
                              onChange={(e) => {
                                setValue(`ticketTypes.${index}.saleStartNow` as any, e.target.checked);
                                if (e.target.checked) {
                                  setValue(`ticketTypes.${index}.saleStart`, undefined);
                                }
                              }}
                              className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400">Start selling immediately</span>
                          </label>
                          {!saleStartNow && saleStartNow !== undefined && (
                            <input
                              type="datetime-local"
                              min={nowString}
                              max={maxTicketSaleEnd}
                              onChange={(e) => {
                                if (e.target.value) {
                                  setValue(`ticketTypes.${index}.saleStart`, localInputToUTC(e.target.value, selectedTimezone));
                                }
                              }}
                              className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-100"
                            />
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Sale End</Label>
                        <input
                          type="datetime-local"
                          min={nowString}
                          max={maxTicketSaleEnd}
                          value={ticketSaleEndLocals[index] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTicketSaleEndLocals(prev => ({ ...prev, [index]: val }));
                            if (val) {
                              setValue(`ticketTypes.${index}.saleEnd`, localInputToUTC(val, selectedTimezone));
                            }
                          }}
                          className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-100"
                        />
                        {startDateLocal ? (
                          <p className="text-xs text-gray-400">Default: 1 day before event. Change if needed.</p>
                        ) : (
                          <p className="text-xs text-gray-400">Set event start date to auto-fill</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Goodies */}
                  {orgProducts.length > 0 && (
                    <div className="mt-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Included Goodies</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(ticketGoodies[index] || []).map((pid: string) => {
                          const product = orgProducts.find((p: any) => p.id === pid);
                          return product ? (
                            <span key={pid} className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                              {product.name}
                              <button type="button" onClick={() => setTicketGoodies((prev) => ({ ...prev, [index]: (prev[index] || []).filter((id: string) => id !== pid) }))} className="text-orange-400 hover:text-orange-600">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                      <select
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          setTicketGoodies((prev) => {
                            const current = prev[index] || [];
                            if (current.includes(e.target.value)) return prev;
                            return { ...prev, [index]: [...current, e.target.value] };
                          });
                        }}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-100"
                      >
                        <option value="">+ Add a goodie...</option>
                        {orgProducts.filter((p: any) => !(ticketGoodies[index] || []).includes(p.id)).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} {p.hasSizeVariant ? '(Has Sizes)' : '(Free Size)'}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 sticky bottom-4 z-10">
          <Button type="button" variant="outline" className="rounded-full shadow-sm" onClick={() => router.back()} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="rounded-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/20 px-6">
            <Sparkles className="mr-1.5 h-4 w-4" />
            {isSubmitting ? 'Creating Event...' : 'Create Event'}
          </Button>
        </div>

        {isSubmitting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white dark:bg-gray-800 px-8 py-6 shadow-xl">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Creating your event...</p>
              <p className="text-xs text-gray-400">You'll be redirected to edit it shortly</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
