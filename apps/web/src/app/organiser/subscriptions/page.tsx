'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Crown, Check, AlertTriangle, Clock, X, Star } from 'lucide-react';

interface Plan {
  id: string; tier: string; name: string; price: number;
  maxEventsPerMonth: number; maxTicketTiers: number; maxTicketsPerEvent: number;
  maxStaffAccounts: number; commissionPercent: number; features: string[];
}

interface Usage {
  events: { used: number; max: number }; ticketTiers: { max: number };
  ticketsPerEvent: { max: number }; staff: { used: number; max: number };
  commission: number; tier: string; expiresAt: string | null;
  daysRemaining: number | null; isExpiringSoon: boolean; canRenew: boolean;
  scheduledPlan: { tier: string } | null;
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState<Plan | null>(null);
  const [activateOption, setActivateOption] = useState<'schedule' | 'now'>('schedule');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      const [plansRes, usageRes] = await Promise.all([
        apiClient.get('/subscriptions/plans'),
        apiClient.get('/subscriptions/usage'),
      ]);
      setPlans(plansRes.data.data);
      setUsage(usageRes.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubscribe = async () => {
    if (!showModal || !usage) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const isFree = usage.tier === 'FREE';
      const res = await apiClient.post('/subscriptions', {
        tier: showModal.tier,
        activateNow: isFree ? true : activateOption === 'now',
      });
      setMessage({ type: 'success', text: res.data.data?.message || `Switched to ${showModal.name} plan` });
      setShowModal(null);
      await fetchData();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage({ type: 'error', text: axiosError.response?.data?.error?.message || 'Failed to change plan' });
    } finally { setActionLoading(false); }
  };

  const handleRenew = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await apiClient.post('/subscriptions/renew');
      setMessage({ type: 'success', text: res.data.data?.message || 'Plan renewed!' });
      await fetchData();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage({ type: 'error', text: axiosError.response?.data?.error?.message || 'Failed to renew' });
    } finally { setActionLoading(false); }
  };

  const handleCancelScheduled = async () => {
    setActionLoading(true);
    try {
      await apiClient.post('/subscriptions/cancel-scheduled');
      setMessage({ type: 'success', text: 'Scheduled plan change cancelled' });
      await fetchData();
    } catch { setMessage({ type: 'error', text: 'Failed to cancel scheduled plan' }); }
    finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your plan and switch to FREE? Your current plan will end immediately.')) return;
    setActionLoading(true);
    try {
      await apiClient.post('/subscriptions/cancel');
      setMessage({ type: 'success', text: 'Plan cancelled. Switched to FREE plan.' });
      await fetchData();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setMessage({ type: 'error', text: axiosError.response?.data?.error?.message || 'Failed to cancel' });
    } finally { setActionLoading(false); }
  };

  if (loading || !usage) {
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-200" />)}</div>;
  }

  const currentTier = usage.tier;
  const isPaid = currentTier !== 'FREE';

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Subscription</h1>

      {message && (
        <div className={cn('mb-4 rounded-lg p-3 text-sm', message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
          {message.text}
        </div>
      )}

      {/* Current Plan Card */}
      <Card className="mb-6 border-orange-200 bg-orange-50/50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-orange-500" />
                <h2 className="text-xl font-bold text-gray-900">{currentTier} Plan</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">Commission: {usage.commission}% per ticket sale</p>
            </div>
            <div className="text-right">
              {usage.expiresAt && (
                <div>
                  <p className="text-sm text-gray-500">
                    {usage.daysRemaining !== null && usage.daysRemaining > 0
                      ? `${usage.daysRemaining} days remaining`
                      : 'Expired'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Expires: {new Date(usage.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </p>
                </div>
              )}
              {!usage.expiresAt && !isPaid && (
                <p className="text-sm text-gray-400">No expiry</p>
              )}
            </div>
          </div>

          {usage.isExpiringSoon && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-100 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Your plan expires in {usage.daysRemaining} day{usage.daysRemaining !== 1 ? 's' : ''}. Renew now to keep your limits.</span>
              <Button size="sm" onClick={handleRenew} disabled={actionLoading} className="ml-auto bg-amber-600 hover:bg-amber-700 text-white">
                {actionLoading ? 'Renewing...' : 'Renew Now'}
              </Button>
            </div>
          )}

          {usage.scheduledPlan && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Switching to <strong>{usage.scheduledPlan.tier}</strong> after current plan ends</span>
              </div>
              <button onClick={handleCancelScheduled} disabled={actionLoading} className="text-xs text-blue-600 hover:text-blue-800 underline">Cancel</button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UsageBar label="Events this month" used={usage.events.used} max={usage.events.max} />
            <UsageBar label="Staff accounts" used={usage.staff.used} max={usage.staff.max} />
          </div>

          {isPaid && (
            <div className="mt-4 pt-4 border-t border-orange-200">
              <button onClick={handleCancel} disabled={actionLoading} className="text-xs text-red-500 hover:text-red-700">
                Cancel plan and switch to FREE
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Available Plans</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const price = Number(plan.price);
          const isCurrentPlan = plan.tier === currentTier;
          const isPopular = plan.tier === 'PRO';

          return (
            <Card key={plan.id} className={cn('relative flex flex-col', isCurrentPlan && 'border-orange-400 ring-2 ring-orange-200', isPopular && !isCurrentPlan && 'border-purple-300')}>
              {isPopular && !isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-purple-600 px-3 py-0.5 text-xs font-bold text-white">
                  <Star className="h-3 w-3" /> Popular
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold text-white">Current</div>
              )}
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-1">
                  {price === 0 ? (
                    <span className="text-3xl font-bold text-gray-900">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900">₹{price.toLocaleString('en-IN')}</span>
                      <span className="text-sm text-gray-500">/month</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-orange-600 font-medium">{Number(plan.commissionPercent)}% commission</p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pt-2">
                <ul className="space-y-2 text-sm flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                      <span className="text-gray-600">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn('w-full mt-4', isCurrentPlan ? 'bg-gray-200 text-gray-500' : 'bg-orange-500 hover:bg-orange-600 text-white')}
                  disabled={isCurrentPlan || actionLoading}
                  onClick={() => { setShowModal(plan); setActivateOption('schedule'); setMessage(null); }}
                >
                  {isCurrentPlan ? 'Current Plan' : price === 0 ? 'Downgrade' : 'Select Plan'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Plan Change Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Switch to {showModal.name}</h2>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>

            {Number(showModal.price) === 0 ? (
              <div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mb-4">
                  <p className="font-medium">Downgrading to FREE plan</p>
                  <p className="mt-1">Your limits will change to: {showModal.maxEventsPerMonth} events/month, {showModal.maxTicketTiers} ticket tiers, {showModal.maxTicketsPerEvent} tickets/event, {showModal.maxStaffAccounts} staff account.</p>
                  <p className="mt-1">Existing events and staff will remain active.</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowModal(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleSubscribe} disabled={actionLoading}>
                    {actionLoading ? 'Switching...' : 'Switch to FREE'}
                  </Button>
                </div>
              </div>
            ) : isPaid && usage.daysRemaining && usage.daysRemaining > 0 ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Your current <strong>{currentTier}</strong> plan expires on{' '}
                  <strong>{usage.expiresAt ? new Date(usage.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : ''}</strong>
                  {' '}({usage.daysRemaining} day{usage.daysRemaining > 1 ? 's' : ''} left)
                </p>
                <div className="space-y-3 mb-6">
                  <label className={cn('flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors', activateOption === 'schedule' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-50')}>
                    <input type="radio" name="activate" checked={activateOption === 'schedule'} onChange={() => setActivateOption('schedule')} className="mt-1 accent-orange-500" />
                    <div>
                      <p className="font-medium text-gray-900">Activate after current plan ends</p>
                      <p className="text-xs text-gray-500">Your {currentTier} plan continues until expiry. {showModal.name} starts automatically.</p>
                    </div>
                  </label>
                  <label className={cn('flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors', activateOption === 'now' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-50')}>
                    <input type="radio" name="activate" checked={activateOption === 'now'} onChange={() => setActivateOption('now')} className="mt-1 accent-orange-500" />
                    <div>
                      <p className="font-medium text-gray-900">Activate now</p>
                      <p className="text-xs text-red-500">Current {currentTier} plan will end immediately. No refund for remaining days.</p>
                    </div>
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowModal(null)}>Cancel</Button>
                  <Button onClick={handleSubscribe} disabled={actionLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
                    {actionLoading ? 'Processing...' : `Confirm — ₹${Number(showModal.price).toLocaleString('en-IN')}`}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="rounded-lg bg-gray-50 p-4 mb-4 text-center">
                  <p className="text-3xl font-bold text-gray-900">₹{Number(showModal.price).toLocaleString('en-IN')}</p>
                  <p className="text-sm text-gray-500">per month · {Number(showModal.commissionPercent)}% commission</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowModal(null)}>Cancel</Button>
                  <Button onClick={handleSubscribe} disabled={actionLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
                    {actionLoading ? 'Processing...' : `Subscribe — ₹${Number(showModal.price).toLocaleString('en-IN')}`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(Math.round((used / max) * 100), 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{used}/{max >= 999 ? '∞' : max}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-gray-200">
        <div className={cn('h-2 rounded-full transition-all', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-orange-500')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
