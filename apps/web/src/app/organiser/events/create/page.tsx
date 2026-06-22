'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createEventBaseSchema, type CreateEventFormValues, type EventCategoryResponse } from '@thoovitickets/shared';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Shield } from 'lucide-react';
import { MapPicker } from '@/components/events/map-picker';
import { AiDescriptionGenerator } from '@/components/ai/ai-description-generator';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<EventCategoryResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [eventImageUrl, setEventImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
      ticketTypes: [
        { name: 'General', price: 0, totalQty: 100, maxPerOrder: 5, currency: 'INR' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ticketTypes',
  });

  useEffect(() => {
    apiClient.get('/categories').then((res) => setCategories(res.data.data));
  }, []);

  const onSubmit = async (data: CreateEventFormValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = { ...data, latitude, longitude, imageUrl: eventImageUrl };
      const res = await apiClient.post('/events', payload);
      const event = res.data.data;
      router.push(`/organiser/events/${event.id}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string; details?: string[] } } } };
      const details = axiosError.response?.data?.error?.details;
      setError(
        Array.isArray(details) ? details.join(', ') : axiosError.response?.data?.error?.message || 'Failed to create event',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const profileCompleted = (user as any)?.profileCompleted;

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
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Create New Event</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input id="title" placeholder="e.g. Summer Music Festival 2026" error={errors.title?.message} {...register('title')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                rows={4}
                placeholder="Describe your event in detail (min 20 characters)"
                className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-gray-100"
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
                  if (data.shortDesc) setValue('shortDesc' as any, data.shortDesc);
                  if (data.tags?.length) setValue('tags', data.tags);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDesc">Short Description</Label>
              <Input id="shortDesc" placeholder="Brief one-liner for event cards (max 300 chars)" {...register('shortDesc')} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <Select id="categoryId" error={errors.categoryId?.message} {...register('categoryId')}>
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon ? `${cat.icon} ` : ''}{cat.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" placeholder="e.g. outdoor, live-music, family" {...register('tags', {
                  setValueAs: (v: string) => typeof v === 'string' ? v.split(',').map(t => t.trim()).filter(Boolean) : v,
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
            {eventImageUrl ? (
              <div className="relative">
                <img src={eventImageUrl} alt="Event" className="h-48 w-full rounded-lg object-cover" />
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
                  <p className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG or WebP. Max 5MB.</p>
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

        {/* Date & Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date & Time *</Label>
                <Input id="startDate" type="datetime-local" error={errors.startDate?.message} {...register('startDate', {
                  setValueAs: (v: string) => v ? new Date(v).toISOString() : '',
                })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date & Time *</Label>
                <Input id="endDate" type="datetime-local" error={errors.endDate?.message} {...register('endDate', {
                  setValueAs: (v: string) => v ? new Date(v).toISOString() : '',
                })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saleCutoffDate">Ticket Sale Cutoff</Label>
                <Input id="saleCutoffDate" type="datetime-local" {...register('saleCutoffDate' as any, {
                  setValueAs: (v: string) => v ? new Date(v).toISOString() : undefined,
                })} />
                <p className="text-xs text-gray-400 dark:text-gray-500">Sales stop at this time</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Event Timezone</Label>
              <select
                id="timezone"
                className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                {...register('timezone' as any)}
                defaultValue="Asia/Kolkata"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="America/Chicago">America/Chicago (CST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                <option value="Pacific/Auckland">Pacific/Auckland (NZST)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue *</Label>
                <Input id="venue" placeholder="e.g. Convention Center" error={errors.venue?.message} {...register('venue')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Full street address" {...register('address')} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" placeholder="e.g. Chennai" error={errors.city?.message} {...register('city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" placeholder="e.g. Tamil Nadu" {...register('state')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAttendees">Max Attendees</Label>
                <Input id="maxAttendees" type="number" placeholder="Optional" {...register('maxAttendees', { valueAsNumber: true })} />
              </div>
            </div>

            {/* Map Location Picker */}
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
                <Plus className="mr-1 h-4 w-4" /> Add Ticket
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.ticketTypes && typeof errors.ticketTypes.message === 'string' && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.ticketTypes.message}</p>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Ticket #{index + 1}</span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Name *</Label>
                    <Input placeholder="e.g. General, VIP" error={errors.ticketTypes?.[index]?.name?.message} {...register(`ticketTypes.${index}.name`)} />
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
                  <Input placeholder="What's included in this ticket?" {...register(`ticketTypes.${index}.description`)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Event (Draft)'}
          </Button>
        </div>
      </form>
    </div>
  );
}
