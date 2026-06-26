'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  _count: { events: number };
}

const defaultEmojis = ['🎵', '⚽', '😂', '💻', '🎭', '🍕', '💼', '🧘', '📚', '🎪', '🎬', '🎮', '🏋️', '🎨', '🎤', '🌍', '🚗', '🏠', '💡', '🎯'];

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', icon: '', description: '', sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iconMode, setIconMode] = useState<'emoji' | 'upload'>('emoji');
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const fetchCategories = () => {
    apiClient.get('/admin/categories').then((res) => {
      setCategories(res.data.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchCategories(); }, []);

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await apiClient.patch(`/admin/categories/${editingId}`, {
          name: form.name,
          icon: form.icon || null,
          description: form.description || null,
          sortOrder: form.sortOrder,
        });
      } else {
        await apiClient.post('/admin/categories', {
          name: form.name,
          slug: form.slug || generateSlug(form.name),
          icon: form.icon || null,
          description: form.description || null,
          sortOrder: form.sortOrder,
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', slug: '', icon: '', description: '', sortOrder: 0 });
      fetchCategories();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, icon: cat.icon || '', description: cat.description || '', sortOrder: cat.sortOrder });
    setIconMode(cat.icon?.startsWith('http') ? 'upload' : 'emoji');
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Only works if no events use it.')) return;
    try {
      await apiClient.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Cannot delete');
    }
  };

  const handleToggleActive = async (cat: Category) => {
    await apiClient.patch(`/admin/categories/${cat.id}`, { isActive: !cat.isActive });
    fetchCategories();
  };

  if (loading) {
    return <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Categories ({categories.length})</h1>
        <Button
          className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
          onClick={() => {
            setEditingId(null);
            setForm({ name: '', slug: '', icon: '', description: '', sortOrder: categories.length + 1 });
            setShowForm(true);
            setError(null);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? 'Edit Category' : 'New Category'}</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-3 rounded-md bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-600 dark:text-red-400">{error}</div>}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    maxLength={100}
                    onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : generateSlug(e.target.value) })}
                    placeholder="e.g. Music"
                  />
                </div>
                {!editingId && (
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input value={form.slug} maxLength={100} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="flex flex-wrap gap-2 sm:gap-4 mb-2">
                  <button
                    type="button"
                    onClick={() => setIconMode('emoji')}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${iconMode === 'emoji' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    Emoji
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconMode('upload')}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${iconMode === 'upload' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    Upload Image
                  </button>
                </div>

                {iconMode === 'emoji' ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {defaultEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setForm({ ...form, icon: emoji })}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border text-xl transition-all ${form.icon === emoji ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-200' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      placeholder="Or type any emoji here"
                      className="w-32"
                    />
                  </>
                ) : (
                  <div className="space-y-3">
                    {form.icon && form.icon.startsWith('http') && (
                      <div className="flex items-center gap-3">
                        <img src={form.icon} alt="Icon" className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700" />
                        <button type="button" onClick={() => setForm({ ...form, icon: '' })} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      </div>
                    )}
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 transition-colors hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                      <Plus className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{uploadingIcon ? 'Uploading...' : 'Click to upload icon'}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">PNG, SVG, JPG. Max 2MB. Recommended: 128x128px</p>
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/svg+xml,image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploadingIcon}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { setError('Icon must be under 2MB'); return; }
                          setUploadingIcon(true);
                          try {
                            const formData = new FormData();
                            formData.append('file', file);
                            const res = await apiClient.post('/upload/avatar', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            setForm({ ...form, icon: res.data.data.url });
                          } catch { setError('Failed to upload icon'); }
                          finally { setUploadingIcon(false); }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} maxLength={300} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving || !form.name} className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      <div className="space-y-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-white dark:bg-gray-800 p-4 transition-colors ${!cat.isActive ? 'border-gray-200 dark:border-gray-700 opacity-50' : 'border-gray-200 dark:border-gray-700'}`}
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <GripVertical className="hidden h-4 w-4 shrink-0 text-gray-300 sm:block" />
              {cat.icon?.startsWith('http') ? (
                <img src={cat.icon} alt={cat.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20 text-xl">
                  {cat.icon || '🎫'}
                </span>
              )}
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{cat.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  /{cat.slug} &middot; {cat._count.events} event{cat._count.events !== 1 ? 's' : ''}
                  {!cat.isActive && <span className="ml-2 text-red-500">(Hidden)</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleToggleActive(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${cat.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}
              >
                {cat.isActive ? 'Active' : 'Hidden'}
              </button>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                <Pencil className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
