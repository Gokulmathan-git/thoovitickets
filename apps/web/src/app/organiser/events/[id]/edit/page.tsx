'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Globe, Clock } from 'lucide-react';
import { MapPicker } from '@/components/events/map-picker';
import { AiDescriptionGenerator } from '@/components/ai/ai-description-generator';
import type { EventCategoryResponse } from '@thoovitickets/shared';

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

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [categories, setCategories] = useState<EventCategoryResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [eventImageUrl, setEventImageUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState('Asia/Kolkata');
  const [startDateLocal, setStartDateLocal] = useState('');
  const [endDateLocal, setEndDateLocal] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<any>({
    defaultValues: { tags: [], ticketTypes: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'ticketTypes' });

  useEffect(() => {
    Promise.all([
      apiClient.get(`/events/my/${eventId}`),
      apiClient.get('/categories'),
    ]).then(([eventRes, catsRes]) => {
      const event = eventRes.data.data;
      setCategories(catsRes.data.data);

      const tz = event.timezone || 'Asia/Kolkata';
      setSelectedTimezone(tz);
      setLatitude(event.latitude || null);
      setLongitude(event.longitude || null);
      setEventImageUrl(event.imageUrl || null);
      setBannerUrl(event.bannerUrl || null);

      if (event.startDate) {
        setStartDateLocal(toLocalDatetimeString(new Date(event.startDate), tz));
      }
      if (event.endDate) {
        setEndDateLocal(toLocalDatetimeString(new Date(event.endDate), tz));
      }

      reset({
        title: event.title,
        description: event.description,
        venue: event.venue,
        address: event.address || '',
        city: event.city,
        state: event.state || '',
        country: event.country || 'India',
        categoryId: event.category?.id || event.categoryId,
        maxAttendees: event.maxAttendees || undefined,
        tags: event.tags || [],
        startDate: event.startDate,
        endDate: event.endDate,
        timezone: tz,
        ticketTypes: (event.ticketTypes || []).map((tt: any) => ({
          name: tt.name,
          description: tt.description || '',
          price: Number(tt.price),
          currency: tt.currency || 'INR',
          totalQty: tt.totalQty,
          maxPerOrder: tt.maxPerOrder || 5,
        })),
      });
    }).catch(() => {
      router.push('/organiser/events');
    }).finally(() => {
      setLoading(false);
    });
  }, [eventId, reset, router]);

  const maxTicketSaleEnd = useMemo(() => {
    if (!startDateLocal) return '';
    const eventStart = new Date(startDateLocal);
    const oneDayBefore = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);
    return toLocalDatetimeString(oneDayBefore, selectedTimezone);
  }, [startDateLocal, selectedTimezone]);

  const handleStartDateChange = (value: string) => {
    setStartDateLocal(value);
    if (value) {
      setValue('startDate', localInputToUTC(value, selectedTimezone));
    }
    if (endDateLocal && value) {
      const threeHoursAfter = new Date(new Date(value).getTime() + 3 * 60 * 60 * 1000);
      if (new Date(endDateLocal) < threeHoursAfter) {
        setEndDateLocal('');
        setValue('endDate', '');
      }
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDateLocal(value);
    if (value) {
      setValue('endDate', localInputToUTC(value, selectedTimezone));
    }
  };

  const handleTimezoneChange = (tz: string) => {
    setSelectedTimezone(tz);
    setValue('timezone', tz);
    if (startDateLocal) setValue('startDate', localInputToUTC(startDateLocal, tz));
    if (endDateLocal) setValue('endDate', localInputToUTC(endDateLocal, tz));
  };

  const onSubmit = async (data: any) => {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const payload: any = {
        title: data.title,
        description: data.description,
        venue: data.venue,
        address: data.address || undefined,
        city: data.city,
        state: data.state || undefined,
        country: data.country,
        startDate: data.startDate,
        endDate: data.endDate,
        categoryId: data.categoryId,
        maxAttendees: data.maxAttendees || undefined,
        tags: data.tags,
        timezone: data.timezone,
        latitude,
        longitude,
        imageUrl: eventImageUrl,
        bannerUrl,
      };

      await apiClient.patch(`/events/${eventId}`, payload);
      setMessage({ type: 'success', text: 'Event updated successfully!' });
      setTimeout(() => router.push(`/organiser/events/${eventId}`), 1000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string; details?: string[] } } } };
      const details = axiosError.response?.data?.error?.details;
      const msg = Array.isArray(details) ? details.join(', ') : axiosError.response?.data?.error?.message || 'Failed to update event';
      setError(msg);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Edit Event</h1>
        <Button variant="outline" onClick={() => router.push(`/organiser/events/${eventId}`)}>Back to Event</Button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {message && (
          <div className={`rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input id="title" placeholder="e.g. Summer Music Festival 2026" maxLength={200} error={errors.title?.message as string} {...register('title')} />
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 space-y-4">
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
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:text-gray-100"
                  />
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
                  <p className="text-xs text-gray-400">Min 3 hours after start</p>
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
                placeholder="Describe your event in detail"
                className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:text-gray-100"
                {...register('description')}
              />
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
                <Select id="categoryId" error={errors.categoryId?.message as string} {...register('categoryId')}>
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" placeholder="e.g. outdoor, live-music, family" maxLength={50} {...register('tags', {
                  setValueAs: (v: string) => typeof v === 'string' ? v.split(',').map((t: string) => t.trim()).filter(Boolean) : v,
                })} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Image */}
        <Card>
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
                    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
                    setUploadingImage(true);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await apiClient.post('/upload/event', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                      setEventImageUrl(res.data.data.url);
                    } catch { setError('Failed to upload image'); }
                    finally { setUploadingImage(false); }
                  }}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Event Banner (Detail Page) */}
        <Card>
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
                    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return; }
                    setUploadingBanner(true);
                    try {
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await apiClient.post('/upload/event', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                      setBannerUrl(res.data.data.url);
                    } catch { setError('Failed to upload banner'); }
                    finally { setUploadingBanner(false); }
                  }}
                />
              </label>
            )}
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue *</Label>
                <Input id="venue" placeholder="e.g. Convention Center" maxLength={200} error={errors.venue?.message as string} {...register('venue')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Full street address" maxLength={300} {...register('address')} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" placeholder="e.g. Chennai" maxLength={100} error={errors.city?.message as string} {...register('city')} />
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

        {/* Ticket Types (read-only summary) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ticket Types</CardTitle>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No ticket types</p>
            ) : (
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{watch(`ticketTypes.${index}.name`)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{watch(`ticketTypes.${index}.price`)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{watch(`ticketTypes.${index}.totalQty`)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Max/Order</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{watch(`ticketTypes.${index}.maxPerOrder`)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-gray-400">Ticket types cannot be modified after creation. Contact support if you need changes.</p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`/organiser/events/${eventId}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
