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
import { Trash2, Plus } from 'lucide-react';

export default function CreateEventPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<EventCategoryResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventBaseSchema),
    defaultValues: {
      country: 'India',
      tags: [],
      ticketTypes: [
        { name: 'General', price: 0, totalQty: 100, maxPerOrder: 10, currency: 'INR' },
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
      const res = await apiClient.post('/events', data);
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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Create New Event</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
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
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                {...register('description')}
              />
              {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
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
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
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

        {/* Date & Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date & Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                onClick={() => append({ name: '', price: 0, totalQty: 50, maxPerOrder: 10, currency: 'INR' })}
              >
                <Plus className="mr-1 h-4 w-4" /> Add Ticket
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.ticketTypes && typeof errors.ticketTypes.message === 'string' && (
              <p className="text-sm text-red-600">{errors.ticketTypes.message}</p>
            )}

            {fields.map((field, index) => (
              <div key={field.id} className="rounded-md border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Ticket #{index + 1}</span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
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
