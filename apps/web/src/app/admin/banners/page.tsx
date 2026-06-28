'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Eye, EyeOff, Image as ImageIcon, ExternalLink, Calendar } from 'lucide-react';

interface Banner {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkType: string;
  linkUrl: string | null;
  eventId: string | null;
  isActive: boolean;
  sortOrder: number;
  event: { id: string; title: string; slug: string } | null;
}

interface EventOption {
  id: string;
  title: string;
  slug: string;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    linkType: 'none',
    linkUrl: '',
    eventId: '',
  });

  const fetchBanners = async () => {
    try {
      const res = await apiClient.get('/admin/banners');
      setBanners(res.data.data);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load banners' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await apiClient.get('/admin/events?status=PUBLISHED&limit=100');
      setEvents((res.data.data?.events || res.data.data || []).map((e: any) => ({ id: e.id, title: e.title, slug: e.slug })));
    } catch {}
  };

  useEffect(() => {
    fetchBanners();
    fetchEvents();
  }, []);

  const resetForm = () => {
    setForm({ title: '', description: '', imageUrl: '', linkType: 'none', linkUrl: '', eventId: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be under 5MB' });
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/upload/event', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm(f => ({ ...f, imageUrl: res.data.data.url }));
    } catch {
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.imageUrl.trim()) {
      setMessage({ type: 'error', text: 'Title and image are required' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        imageUrl: form.imageUrl,
        linkType: form.linkType,
        linkUrl: form.linkType === 'url' ? form.linkUrl : undefined,
        eventId: form.linkType === 'event' ? form.eventId : undefined,
      };
      if (editingId) {
        await apiClient.patch(`/admin/banners/${editingId}`, payload);
        setMessage({ type: 'success', text: 'Banner updated' });
      } else {
        await apiClient.post('/admin/banners', payload);
        setMessage({ type: 'success', text: 'Banner created' });
      }
      resetForm();
      fetchBanners();
    } catch {
      setMessage({ type: 'error', text: 'Failed to save banner' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (banner: Banner) => {
    setForm({
      title: banner.title,
      description: banner.description || '',
      imageUrl: banner.imageUrl,
      linkType: banner.linkType,
      linkUrl: banner.linkUrl || '',
      eventId: banner.eventId || '',
    });
    setEditingId(banner.id);
    setShowForm(true);
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    setTogglingId(id);
    try {
      await apiClient.patch(`/admin/banners/${id}`, { isActive: !isActive });
      await fetchBanners();
    } catch {
      setMessage({ type: 'error', text: 'Failed to update banner' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await apiClient.delete(`/admin/banners/${id}`);
      setMessage({ type: 'success', text: 'Banner deleted' });
      fetchBanners();
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete banner' });
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const ids = banners.map(b => b.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    try {
      await apiClient.patch('/admin/banners/reorder', { ids });
      fetchBanners();
    } catch {}
  };

  const handleMoveDown = async (index: number) => {
    if (index === banners.length - 1) return;
    const ids = banners.map(b => b.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    try {
      await apiClient.patch('/admin/banners/reorder', { ids });
      fetchBanners();
    } catch {}
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Homepage Banners</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage hero carousel banners. Recommended size: <strong>1400 x 500px</strong></p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
          <Plus className="mr-1 h-4 w-4" /> Add Banner
        </Button>
      </div>

      {message && (
        <div className={`mb-4 rounded-md p-3 text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? 'Edit Banner' : 'New Banner'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} maxLength={150} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Banner headline" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={form.description} maxLength={300} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description (optional)" />
            </div>

            <div className="space-y-2">
              <Label>Banner Image * <span className="text-gray-400 font-normal">(1400 x 500px recommended)</span></Label>
              {form.imageUrl ? (
                <div className="relative">
                  <img src={form.imageUrl} alt="Banner preview" className="h-40 w-full rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                    className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 transition-colors hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">{uploadingImage ? 'Uploading...' : 'Click to upload banner image'}</p>
                  <p className="text-xs text-gray-400">JPG, PNG, WebP. Max 5MB. Best at 1400x500px.</p>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploadingImage} onChange={handleImageUpload} />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label>Link Type</Label>
              <select
                value={form.linkType}
                onChange={(e) => setForm(f => ({ ...f, linkType: e.target.value, linkUrl: '', eventId: '' }))}
                className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-100"
              >
                <option value="none">No link</option>
                <option value="url">External URL</option>
                <option value="event">Link to Event</option>
              </select>
            </div>

            {form.linkType === 'url' && (
              <div className="space-y-2">
                <Label>URL</Label>
                <Input value={form.linkUrl} maxLength={500} onChange={(e) => setForm(f => ({ ...f, linkUrl: e.target.value }))} placeholder="https://example.com" />
              </div>
            )}

            {form.linkType === 'event' && (
              <div className="space-y-2">
                <Label>Select Event</Label>
                <select
                  value={form.eventId}
                  onChange={(e) => setForm(f => ({ ...f, eventId: e.target.value }))}
                  className="flex w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-gray-100"
                >
                  <option value="">Select an event</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Banner' : 'Create Banner'}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {banners.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-500 dark:text-gray-400">No banners yet. Add your first homepage banner.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {banners.map((banner, index) => (
            <Card key={banner.id} className={!banner.isActive ? 'border-dashed border-gray-300 dark:border-gray-700' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1 pt-2">
                    <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <GripVertical className="h-4 w-4 rotate-180" />
                    </button>
                    <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                    <button onClick={() => handleMoveDown(index)} disabled={index === banners.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30">
                      <GripVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="relative shrink-0">
                    <img src={banner.imageUrl} alt={banner.title} className={`h-20 w-36 rounded-lg object-cover border border-gray-200 dark:border-gray-700 ${!banner.isActive ? 'grayscale opacity-60' : ''}`} />
                    {!banner.isActive && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-900/30">
                        <EyeOff className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-semibold truncate ${banner.isActive ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>{banner.title}</h3>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${banner.isActive ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {banner.description && <p className={`text-sm truncate ${banner.isActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>{banner.description}</p>}
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                      {banner.linkType === 'url' && (
                        <span className="flex items-center gap-1"><ExternalLink className="h-3 w-3" /> External URL</span>
                      )}
                      {banner.linkType === 'event' && banner.event && (
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {banner.event.title}</span>
                      )}
                      {banner.linkType === 'none' && <span>No link</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(banner.id, banner.isActive)}
                      disabled={togglingId === banner.id}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 ${banner.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      title={banner.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${banner.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(banner)}>Edit</Button>
                    <button onClick={() => handleDelete(banner.id)} className="rounded-md p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
