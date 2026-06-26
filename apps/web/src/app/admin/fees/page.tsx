'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

interface ConvenienceFeeSlab {
  id: string;
  minAmount: number;
  maxAmount: number | null;
  feeType: 'FIXED' | 'PERCENTAGE';
  feeValue: number;
}

const emptyForm = {
  minAmount: 0,
  maxAmount: '' as string | number,
  feeType: 'FIXED' as 'FIXED' | 'PERCENTAGE',
  feeValue: 0,
};

export default function AdminFeesPage() {
  const [slabs, setSlabs] = useState<ConvenienceFeeSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSlab, setEditingSlab] = useState<ConvenienceFeeSlab | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchSlabs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/convenience-fees');
      setSlabs(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSlabs(); }, []);

  const openCreate = () => {
    setEditingSlab(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (slab: ConvenienceFeeSlab) => {
    setEditingSlab(slab);
    setForm({
      minAmount: slab.minAmount,
      maxAmount: slab.maxAmount ?? '',
      feeType: slab.feeType,
      feeValue: Number(slab.feeValue),
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingSlab(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        minAmount: Number(form.minAmount),
        maxAmount: form.maxAmount === '' ? null : Number(form.maxAmount),
        feeType: form.feeType,
        feeValue: Number(form.feeValue),
      };

      if (editingSlab) {
        await apiClient.patch(`/admin/convenience-fees/${editingSlab.id}`, payload);
      } else {
        await apiClient.post('/admin/convenience-fees', payload);
      }
      setShowForm(false);
      setEditingSlab(null);
      setForm(emptyForm);
      fetchSlabs();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to save slab');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slab: ConvenienceFeeSlab) => {
    if (!confirm(`Delete slab (${slab.minAmount} - ${slab.maxAmount ?? 'Unlimited'})?`)) return;
    try {
      await apiClient.delete(`/admin/convenience-fees/${slab.id}`);
      fetchSlabs();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to delete slab');
    }
  };

  const formatValue = (slab: ConvenienceFeeSlab) => {
    return slab.feeType === 'FIXED'
      ? `₹${Number(slab.feeValue).toLocaleString('en-IN')}`
      : `${Number(slab.feeValue)}%`;
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Platform Fee Slabs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage fee slabs applied to ticket bookings based on order amount.</p>
        </div>
        <Button onClick={openCreate} className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Slab
        </Button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{editingSlab ? 'Edit Slab' : 'Add New Slab'}</CardTitle>
              <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <CardDescription>
              {editingSlab ? 'Update the fee slab details below.' : 'Define a new platform fee slab.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Min Amount (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minAmount}
                  onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Amount (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxAmount}
                  onChange={(e) => setForm({ ...form, maxAmount: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label>Fee Type</Label>
                <Select
                  value={form.feeType}
                  onChange={(e) => setForm({ ...form, feeType: e.target.value as 'FIXED' | 'PERCENTAGE' })}
                >
                  <option value="FIXED">Fixed</option>
                  <option value="PERCENTAGE">Percentage</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fee Value {form.feeType === 'FIXED' ? '(INR)' : '(%)'}</Label>
                <Input
                  type="number"
                  min={0}
                  max={form.feeType === 'PERCENTAGE' ? 100 : undefined}
                  step={form.feeType === 'PERCENTAGE' ? '0.01' : '1'}
                  value={form.feeValue}
                  onChange={(e) => setForm({ ...form, feeValue: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelForm}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={saving || form.feeValue <= 0}
                className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                {saving ? 'Saving...' : editingSlab ? 'Update Slab' : 'Create Slab'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : slabs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No platform fee slabs configured yet.</p>
            <Button onClick={openCreate} variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" /> Add your first slab
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Min Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Max Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Fee Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Value</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slabs.map((slab) => (
                  <tr key={slab.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                      {'₹'}{slab.minAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {slab.maxAmount !== null
                        ? `₹${slab.maxAmount.toLocaleString('en-IN')}`
                        : <span className="text-gray-400 dark:text-gray-500 italic">Unlimited</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        slab.feeType === 'FIXED'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      }`}>
                        {slab.feeType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-semibold">
                      {formatValue(slab)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(slab)}
                          className="rounded p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(slab)}
                          className="rounded p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
