'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, X, Trash2, Edit2, Package, Gift } from 'lucide-react';

interface Variant {
  id?: string;
  size: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  hasSizeVariant: boolean;
  isActive: boolean;
  variants: Variant[];
}

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formHasSize, setFormHasSize] = useState(false);
  const [formSizes, setFormSizes] = useState<string[]>(['']);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/products');
      setProducts(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormImage('');
    setFormHasSize(false);
    setFormSizes(['']);
    setFormError('');
    setEditingProduct(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDesc(product.description || '');
    setFormImage(product.imageUrl || '');
    setFormHasSize(product.hasSizeVariant);
    setFormSizes(
      product.hasSizeVariant
        ? product.variants.map((v) => v.size || '')
        : [''],
    );
    setFormError('');
    setShowForm(true);
  };

  const handleSizeToggle = (checked: boolean) => {
    setFormHasSize(checked);
    if (checked) {
      setFormSizes([...DEFAULT_SIZES]);
    } else {
      setFormSizes(['']);
    }
  };

  const handleSubmit = async () => {
    if (!formName.trim()) { setFormError('Product name is required'); return; }
    if (formHasSize && formSizes.some((s) => !s.trim())) { setFormError('All sizes must have a name'); return; }

    setSaving(true);
    setFormError('');
    try {
      const payload: any = {
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        imageUrl: formImage.trim() || undefined,
        hasSizeVariant: formHasSize,
      };

      if (formHasSize) {
        payload.variants = formSizes.map((s) => ({ size: s.trim() }));
      } else {
        payload.variants = [{ size: undefined }];
      }

      if (editingProduct) {
        await apiClient.patch(`/products/${editingProduct.id}`, payload);
      } else {
        await apiClient.post('/products', payload);
      }

      setShowForm(false);
      resetForm();
      fetchProducts();
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this product?')) return;
    try {
      await apiClient.delete(`/products/${id}`);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Products / Goodies</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Goodies included free with ticket tiers (T-shirts, caps, etc.). Quantity follows ticket sales.</p>
        </div>
        <Button onClick={openCreateForm} className="bg-orange-600 hover:bg-orange-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-12 text-center">
          <Gift className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-gray-500 dark:text-gray-400 font-medium">No products yet</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">Add goodies like T-shirts, caps, or water bottles to include with your event tickets.</p>
          <Button onClick={openCreateForm} className="mt-4 bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Your First Product
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <Package className="h-6 w-6 text-orange-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{product.name}</h3>
                    {product.description && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{product.description}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditForm(product)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {product.hasSizeVariant ? (
                  <div className="flex flex-wrap gap-1.5">
                    {product.variants.map((v) => (
                      <span key={v.id} className="rounded-md px-2 py-0.5 text-xs font-medium border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                        {v.size || 'Free Size'}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    Free Size (no size selection needed)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{formError}</div>}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Product Name *</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. T-Shirt, Cap, Water Bottle" maxLength={100} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Description</label>
                <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Optional description" maxLength={500} />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Image URL</label>
                <Input value={formImage} onChange={(e) => setFormImage(e.target.value)} placeholder="https://..." />
              </div>

              {/* Size Toggle */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formHasSize}
                    onChange={(e) => handleSizeToggle(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400 accent-orange-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Has size variants</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Enable for T-shirts, track pants, shorts — customer picks size at checkout</p>
                  </div>
                </label>
              </div>

              {/* Size Variants */}
              {formHasSize && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Available Sizes</label>
                    <button onClick={() => setFormSizes([...formSizes, ''])} className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                      + Add Size
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formSizes.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <Input
                          value={s}
                          onChange={(e) => setFormSizes(formSizes.map((v, i) => i === idx ? e.target.value : v))}
                          placeholder="e.g. M"
                          className="w-20 text-center"
                          maxLength={20}
                        />
                        {formSizes.length > 1 && (
                          <button onClick={() => setFormSizes(formSizes.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white">
                {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
