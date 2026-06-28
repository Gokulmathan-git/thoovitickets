'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Edit2, X, Trash2 } from 'lucide-react';

interface Plan {
  id: string;
  tier: string;
  name: string;
  price: number;
  priceQuarterly: number | null;
  priceHalfYearly: number | null;
  priceYearly: number | null;
  maxEventsPerMonth: number;
  maxTicketTiers: number;
  maxTicketsPerEvent: number;
  maxStaffAccounts: number;
  commissionPercent: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

const emptyForm = {
  tier: '', name: '', price: 0, priceQuarterly: 0, priceHalfYearly: 0, priceYearly: 0,
  maxEventsPerMonth: 2, maxTicketTiers: 2,
  maxTicketsPerEvent: 300, maxStaffAccounts: 1, commissionPercent: 4, features: '', sortOrder: 0,
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/plans');
      setPlans(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      tier: plan.tier,
      name: plan.name,
      price: Number(plan.price),
      priceQuarterly: Number(plan.priceQuarterly || 0),
      priceHalfYearly: Number(plan.priceHalfYearly || 0),
      priceYearly: Number(plan.priceYearly || 0),
      maxEventsPerMonth: plan.maxEventsPerMonth,
      maxTicketTiers: plan.maxTicketTiers,
      maxTicketsPerEvent: plan.maxTicketsPerEvent,
      maxStaffAccounts: plan.maxStaffAccounts,
      commissionPercent: Number(plan.commissionPercent),
      features: plan.features.join('\n'),
      sortOrder: plan.sortOrder,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
      };

      if (editingPlan) {
        await apiClient.patch(`/admin/plans/${editingPlan.id}`, payload);
      } else {
        await apiClient.post('/admin/plans', payload);
      }
      setShowModal(false);
      fetchPlans();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Deactivate "${plan.name}" plan?`)) return;
    try {
      await apiClient.delete(`/admin/plans/${plan.id}`);
      fetchPlans();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to delete plan');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Subscription Plans</h1>
        <Button onClick={openCreate} className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
          <Plus className="mr-2 h-4 w-4" /> Create Plan
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${!plan.isActive ? 'opacity-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(plan)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {plan.tier !== 'FREE' && (
                      <button onClick={() => handleDelete(plan)} className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(() => {
                    const mo = Number(plan.price);
                    const q = Number(plan.priceQuarterly || 0);
                    const h = Number(plan.priceHalfYearly || 0);
                    const y = Number(plan.priceYearly || 0);
                    if (mo > 0) return <>{`₹${mo.toLocaleString('en-IN')}`}<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mo</span></>;
                    if (q > 0) return <>{`₹${q.toLocaleString('en-IN')}`}<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/3mo</span></>;
                    if (h > 0) return <>{`₹${h.toLocaleString('en-IN')}`}<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/6mo</span></>;
                    if (y > 0) return <>{`₹${y.toLocaleString('en-IN')}`}<span className="text-sm font-normal text-gray-500 dark:text-gray-400">/yr</span></>;
                    return 'Free';
                  })()}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {Number(plan.price) > 0 && <span className="text-[10px] rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-gray-500">mo: ₹{Number(plan.price).toLocaleString('en-IN')}</span>}
                  {Number(plan.priceQuarterly || 0) > 0 && <span className="text-[10px] rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-gray-500">3mo: ₹{Number(plan.priceQuarterly).toLocaleString('en-IN')}</span>}
                  {Number(plan.priceHalfYearly || 0) > 0 && <span className="text-[10px] rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-gray-500">6mo: ₹{Number(plan.priceHalfYearly).toLocaleString('en-IN')}</span>}
                  {Number(plan.priceYearly || 0) > 0 && <span className="text-[10px] rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-gray-500">yr: ₹{Number(plan.priceYearly).toLocaleString('en-IN')}</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded bg-gray-50 dark:bg-gray-900 p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Events/Month</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{plan.maxEventsPerMonth}</p>
                  </div>
                  <div className="rounded bg-gray-50 dark:bg-gray-900 p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ticket Tiers</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{plan.maxTicketTiers}</p>
                  </div>
                  <div className="rounded bg-gray-50 dark:bg-gray-900 p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tickets/Event</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{plan.maxTicketsPerEvent.toLocaleString()}</p>
                  </div>
                  <div className="rounded bg-gray-50 dark:bg-gray-900 p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Staff</p>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{plan.maxStaffAccounts}</p>
                  </div>
                </div>
                <div className="rounded bg-orange-50 dark:bg-orange-900/20 p-2 text-center">
                  <p className="text-xs text-orange-600">Commission</p>
                  <p className="text-lg font-bold text-orange-700">{Number(plan.commissionPercent)}%</p>
                </div>
                {!plan.isActive && (
                  <p className="text-center text-xs font-medium text-red-500">INACTIVE</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-800 p-4 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tier ID</Label>
                  <Input value={form.tier} maxLength={30} onChange={(e) => setForm({ ...form, tier: e.target.value.toUpperCase() })} placeholder="e.g. PRO" disabled={!!editingPlan} />
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input value={form.name} maxLength={50} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pro" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Price (INR/month)</Label>
                  <Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Price - 3 Months (INR) <span className="text-gray-400 text-xs">optional</span></Label>
                  <Input type="number" min={0} value={form.priceQuarterly} onChange={(e) => setForm({ ...form, priceQuarterly: Number(e.target.value) })} placeholder={`Default: ${form.price * 3}`} />
                </div>
                <div className="space-y-1">
                  <Label>Price - 6 Months (INR) <span className="text-gray-400 text-xs">optional</span></Label>
                  <Input type="number" min={0} value={form.priceHalfYearly} onChange={(e) => setForm({ ...form, priceHalfYearly: Number(e.target.value) })} placeholder={`Default: ${form.price * 6}`} />
                </div>
                <div className="space-y-1">
                  <Label>Price - Yearly (INR) <span className="text-gray-400 text-xs">optional</span></Label>
                  <Input type="number" min={0} value={form.priceYearly} onChange={(e) => setForm({ ...form, priceYearly: Number(e.target.value) })} placeholder={`Default: ${form.price * 12}`} />
                </div>
                <div className="space-y-2">
                  <Label>Commission %</Label>
                  <Input type="number" min={0} max={100} step="0.5" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Events/Month</Label>
                  <Input type="number" min={0} value={form.maxEventsPerMonth} onChange={(e) => setForm({ ...form, maxEventsPerMonth: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Ticket Tiers/Event</Label>
                  <Input type="number" min={0} value={form.maxTicketTiers} onChange={(e) => setForm({ ...form, maxTicketTiers: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tickets/Event</Label>
                  <Input type="number" min={0} value={form.maxTicketsPerEvent} onChange={(e) => setForm({ ...form, maxTicketsPerEvent: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Staff Accounts</Label>
                  <Input type="number" min={0} value={form.maxStaffAccounts} onChange={(e) => setForm({ ...form, maxStaffAccounts: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <textarea
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none"
                  rows={5}
                  placeholder="2 events per month&#10;2 ticket tiers per event&#10;300 tickets per event"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.tier || !form.name} className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                  {saving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
