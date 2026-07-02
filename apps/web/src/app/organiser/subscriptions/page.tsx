'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Crown, Check, AlertTriangle, Clock, X, Star, Loader2 } from 'lucide-react';

interface Plan {
  id: string; tier: string; name: string; price: number;
  priceQuarterly: number | null; priceHalfYearly: number | null; priceYearly: number | null;
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

interface PaymentInfo {
  providerOrderId: string;
  amount: number;
  currency: string;
  provider: string;
  keyId?: string;
  planName: string;
  tier: string;
  isRenewal?: boolean;
  prefill: { name: string; email: string; contact: string };
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState<Plan | null>(null);
  const [activateOption, setActivateOption] = useState<'schedule' | 'now'>('schedule');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'half_yearly' | 'yearly'>('monthly');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getCyclePrice = (plan: Plan, cycle: string) => {
    const mo = Number(plan.price);
    switch (cycle) {
      case 'quarterly': return Number(plan.priceQuarterly || 0) || (mo > 0 ? mo * 3 : 0);
      case 'half_yearly': return Number(plan.priceHalfYearly || 0) || (mo > 0 ? mo * 6 : 0);
      case 'yearly': return Number(plan.priceYearly || 0) || (mo > 0 ? mo * 12 : 0);
      default: return mo;
    }
  };
  const getCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'quarterly': return '3 Months';
      case 'half_yearly': return '6 Months';
      case 'yearly': return '1 Year';
      default: return '1 Month';
    }
  };
  const selectedPrice = showModal ? getCyclePrice(showModal, billingCycle) : 0;

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

  const openRazorpayCheckout = (paymentInfo: PaymentInfo, verifyEndpoint: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const win = window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (event: string, handler: (...args: any[]) => void) => void } };
      if (!win.Razorpay) {
        reject(new Error('Payment gateway not loaded. Please refresh the page.'));
        return;
      }

      const rzp = new win.Razorpay({
        key: paymentInfo.keyId,
        amount: paymentInfo.amount * 100,
        currency: paymentInfo.currency,
        name: 'ThooviTickets',
        description: `${paymentInfo.planName} Plan Subscription`,
        image: `${window.location.origin}/Main_logo.png`,
        order_id: paymentInfo.providerOrderId,
        prefill: paymentInfo.prefill,
        theme: { color: '#f97316' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await apiClient.post(verifyEndpoint, {
              providerPaymentId: response.razorpay_payment_id,
              providerOrderId: response.razorpay_order_id,
              providerSignature: response.razorpay_signature,
            });
            const msg = verifyRes.data.data?.message || `${paymentInfo.planName} plan activated!`;
            setMessage({ type: 'success', text: msg });
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled')),
          confirm_close: true,
        },
      });

      rzp.on('payment.failed', (response: { error: { code: string; description: string; source: string; step: string; reason: string } }) => {
        console.error('Razorpay payment failed:', response.error);
        reject(new Error(response.error.description || 'Payment failed'));
      });

      rzp.open();
    });
  };

  const handleMockPayment = async (paymentInfo: PaymentInfo, verifyEndpoint: string) => {
    const mockPaymentId = `mock_pay_${Date.now()}`;
    const mockSignature = 'mock_valid_signature';

    const verifyRes = await apiClient.post(verifyEndpoint, {
      providerPaymentId: mockPaymentId,
      providerOrderId: paymentInfo.providerOrderId,
      providerSignature: mockSignature,
    });

    const msg = verifyRes.data.data?.message || `${paymentInfo.planName} plan activated!`;
    setMessage({ type: 'success', text: msg });
  };

  const handleSubscribe = async () => {
    if (!showModal || !usage) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const isFree = usage.tier === 'FREE';
      const isFreePlan = Number(showModal.price) === 0 && !Number(showModal.priceQuarterly || 0) && !Number(showModal.priceHalfYearly || 0) && !Number(showModal.priceYearly || 0);

      if (isFreePlan) {
        await apiClient.post('/subscriptions', { tier: showModal.tier });
        setMessage({ type: 'success', text: `Switched to ${showModal.name} plan` });
        setShowModal(null);
        await fetchData();
        return;
      }

      const res = await apiClient.post('/subscriptions/initiate-payment', {
        tier: showModal.tier,
        activateNow: isFree ? true : activateOption === 'now',
        billingCycle,
      });

      const data = res.data.data;

      if (data.scheduled) {
        setMessage({ type: 'success', text: data.message });
        setShowModal(null);
        await fetchData();
        return;
      }

      const paymentInfo: PaymentInfo = data;
      setShowModal(null);

      if (paymentInfo.provider === 'razorpay' && paymentInfo.keyId) {
        await openRazorpayCheckout(paymentInfo, '/subscriptions/verify-payment');
      } else {
        await handleMockPayment(paymentInfo, '/subscriptions/verify-payment');
      }

      await fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = error.response?.data?.error?.message || error.message || 'Failed to process payment';
      if (msg !== 'Payment cancelled') {
        setMessage({ type: 'error', text: msg });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenew = async () => {
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await apiClient.post('/subscriptions/renew');
      const data = res.data.data;

      const paymentInfo: PaymentInfo = data;

      if (paymentInfo.provider === 'razorpay' && paymentInfo.keyId) {
        await openRazorpayCheckout(paymentInfo, '/subscriptions/verify-renewal');
      } else {
        await handleMockPayment(paymentInfo, '/subscriptions/verify-renewal');
      }

      await fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const msg = error.response?.data?.error?.message || error.message || 'Failed to renew';
      if (msg !== 'Payment cancelled') {
        setMessage({ type: 'error', text: msg });
      }
    } finally {
      setActionLoading(false);
    }
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
    return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />)}</div>;
  }

  const currentTier = usage.tier;
  const isPaid = currentTier !== 'FREE';

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">Subscription</h1>

      {message && (
        <div className={cn('mb-4 rounded-lg p-3 text-sm', message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400')}>
          {message.text}
        </div>
      )}

      {/* Current Plan Card */}
      <Card className="mb-6 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl">{currentTier} Plan</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Commission: {usage.commission}% per ticket sale</p>
            </div>
            <div className="text-left sm:text-right">
              {usage.expiresAt && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {usage.daysRemaining !== null && usage.daysRemaining > 0
                      ? `${usage.daysRemaining} days remaining`
                      : 'Expired'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Expires: {new Date(usage.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </p>
                </div>
              )}
              {!usage.expiresAt && !isPaid && (
                <p className="text-sm text-gray-400 dark:text-gray-500">No expiry</p>
              )}
            </div>
          </div>

          {usage.isExpiringSoon && (
            <div className="mt-4 flex flex-col gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 p-3 text-sm text-amber-800 dark:text-amber-300 sm:flex-row sm:items-center">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Your plan expires in {usage.daysRemaining} day{usage.daysRemaining !== 1 ? 's' : ''}. Renew now to keep your limits.</span>
              <Button size="sm" onClick={handleRenew} disabled={actionLoading} className="self-start sm:ml-auto bg-amber-600 hover:bg-amber-700 text-white">
                {actionLoading ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Renewing...</> : 'Renew Now'}
              </Button>
            </div>
          )}

          {usage.scheduledPlan && (
            <div className="mt-4 flex flex-col gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-800 dark:text-blue-300 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Switching to <strong>{usage.scheduledPlan.tier}</strong> after current plan ends</span>
              </div>
              <button onClick={handleCancelScheduled} disabled={actionLoading} className="self-start text-xs text-blue-600 hover:text-blue-800 underline sm:self-auto">Cancel</button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UsageBar label="Events this month" used={usage.events.used} max={usage.events.max} />
            <UsageBar label="Staff accounts" used={usage.staff.used} max={usage.staff.max} />
          </div>

          {isPaid && (
            <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
              <button onClick={handleCancel} disabled={actionLoading} className="text-xs text-red-500 hover:text-red-700">
                Cancel plan and switch to FREE
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Available Plans</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  {(() => {
                    const mo = Number(plan.price);
                    const q = Number(plan.priceQuarterly || 0);
                    const h = Number(plan.priceHalfYearly || 0);
                    const y = Number(plan.priceYearly || 0);
                    if (mo > 0) return <><span className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">₹{mo.toLocaleString('en-IN')}</span><span className="text-sm text-gray-500 dark:text-gray-400">/month</span></>;
                    if (q > 0) return <><span className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">₹{q.toLocaleString('en-IN')}</span><span className="text-sm text-gray-500 dark:text-gray-400">/3 months</span></>;
                    if (h > 0) return <><span className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">₹{h.toLocaleString('en-IN')}</span><span className="text-sm text-gray-500 dark:text-gray-400">/6 months</span></>;
                    if (y > 0) return <><span className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">₹{y.toLocaleString('en-IN')}</span><span className="text-sm text-gray-500 dark:text-gray-400">/year</span></>;
                    return <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">Free</span>;
                  })()}
                </div>
                <p className="text-xs text-orange-600 font-medium">{Number(plan.commissionPercent)}% commission</p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pt-2">
                <ul className="space-y-2 text-sm flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                      <span className="text-gray-600 dark:text-gray-300">{f}</span>
                    </li>
                  ))}
                </ul>
                {(() => {
                  const mo = Number(plan.price);
                  const q = Number(plan.priceQuarterly || 0);
                  const h = Number(plan.priceHalfYearly || 0);
                  const y = Number(plan.priceYearly || 0);
                  const isPaidPlan = mo > 0 || q > 0 || h > 0 || y > 0;
                  const isDowngrade = !isPaidPlan && plan.tier === 'FREE';

                  return isCurrentPlan ? (
                    <div className="w-full mt-4 flex items-center justify-center rounded-md border-2 border-orange-400 bg-orange-50 dark:bg-orange-900/20 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400">
                      Current Plan
                    </div>
                  ) : (
                    <Button
                      className="w-full mt-4 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                      disabled={actionLoading}
                      onClick={() => {
                        setShowModal(plan);
                        setActivateOption('schedule');
                        if (mo > 0) setBillingCycle('monthly');
                        else if (q > 0) setBillingCycle('quarterly');
                        else if (h > 0) setBillingCycle('half_yearly');
                        else if (y > 0) setBillingCycle('yearly');
                        else setBillingCycle('monthly');
                        setMessage(null);
                      }}
                    >
                      {isDowngrade ? 'Downgrade' : 'Select Plan'}
                    </Button>
                  );
                })()}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Plan Change Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4 overflow-y-auto">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Switch to {showModal.name}</h2>
              <button onClick={() => setShowModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-5 w-5" /></button>
            </div>

            {(Number(showModal.price) === 0 && !Number(showModal.priceQuarterly || 0) && !Number(showModal.priceHalfYearly || 0) && !Number(showModal.priceYearly || 0)) ? (
              <div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300 mb-4">
                  <p className="font-medium">Downgrading to FREE plan</p>
                  <p className="mt-1">Your limits will change to: {showModal.maxEventsPerMonth} events/month, {showModal.maxTicketTiers} ticket tiers, {showModal.maxTicketsPerEvent} tickets/event, {showModal.maxStaffAccounts} staff account.</p>
                  <p className="mt-1">Existing events and staff will remain active.</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowModal(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleSubscribe} disabled={actionLoading}>
                    {actionLoading ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Switching...</> : 'Switch to FREE'}
                  </Button>
                </div>
              </div>
            ) : isPaid && usage.daysRemaining && usage.daysRemaining > 0 ? (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Your current <strong>{currentTier}</strong> plan expires on{' '}
                  <strong>{usage.expiresAt ? new Date(usage.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : ''}</strong>
                  {' '}({usage.daysRemaining} day{usage.daysRemaining > 1 ? 's' : ''} left)
                </p>
                <div className="space-y-3 mb-6">
                  <label className={cn('flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors', activateOption === 'schedule' ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700')}>
                    <input type="radio" name="activate" checked={activateOption === 'schedule'} onChange={() => setActivateOption('schedule')} className="mt-1 accent-orange-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Schedule after current plan ends</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Pay now, {showModal.name} starts after your {currentTier} plan expires.</p>
                    </div>
                  </label>
                  <label className={cn('flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors', activateOption === 'now' ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700')}>
                    <input type="radio" name="activate" checked={activateOption === 'now'} onChange={() => setActivateOption('now')} className="mt-1 accent-orange-500" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">Activate now</p>
                      <p className="text-xs text-red-500">Current {currentTier} plan will end immediately. No refund for remaining days.</p>
                    </div>
                  </label>
                </div>
                {/* Billing Cycle Selector */}
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Billing Cycle</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([['monthly', '1 Mo', Number(showModal.price)], ['quarterly', '3 Mo', Number(showModal.priceQuarterly || 0) || (Number(showModal.price) > 0 ? Number(showModal.price) * 3 : 0)], ['half_yearly', '6 Mo', Number(showModal.priceHalfYearly || 0) || (Number(showModal.price) > 0 ? Number(showModal.price) * 6 : 0)], ['yearly', '1 Yr', Number(showModal.priceYearly || 0) || (Number(showModal.price) > 0 ? Number(showModal.price) * 12 : 0)]] as [string, string, number][]).filter(([, , p]) => p > 0).map(([val, label, p]) => (
                      <button
                        key={val}
                        onClick={() => setBillingCycle(val as typeof billingCycle)}
                        className={cn('rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors', billingCycle === val ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700')}
                      >
                        {label}
                        {billingCycle !== val && <span className="block text-[10px] mt-0.5 text-gray-400">₹{p.toLocaleString('en-IN')}</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{showModal.name} Plan ({getCycleLabel(billingCycle)})</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">₹{selectedPrice.toLocaleString('en-IN')}</span>
                  </div>
                  {billingCycle !== 'monthly' && (
                    <p className="text-[10px] text-green-600 mt-1">Save ₹{(Number(showModal.price) * (billingCycle === 'quarterly' ? 3 : billingCycle === 'half_yearly' ? 6 : 12) - selectedPrice).toLocaleString('en-IN')} compared to monthly</p>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowModal(null)}>Cancel</Button>
                  <Button onClick={handleSubscribe} disabled={actionLoading} className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                    {actionLoading ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Processing...</> : `Pay ₹${selectedPrice.toLocaleString('en-IN')}`}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                {/* Billing Cycle Selector */}
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Billing Cycle</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([['monthly', '1 Mo'], ['quarterly', '3 Mo'], ['half_yearly', '6 Mo'], ['yearly', '1 Yr']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setBillingCycle(val)}
                        className={cn('rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors', billingCycle === val ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 mb-4 text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">₹{selectedPrice.toLocaleString('en-IN')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{getCycleLabel(billingCycle)} · {Number(showModal.commissionPercent)}% commission</p>
                  {billingCycle !== 'monthly' && (
                    <p className="text-xs text-green-600 mt-1">Save ₹{(Number(showModal.price) * (billingCycle === 'quarterly' ? 3 : billingCycle === 'half_yearly' ? 6 : 12) - selectedPrice).toLocaleString('en-IN')} compared to monthly</p>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowModal(null)}>Cancel</Button>
                  <Button onClick={handleSubscribe} disabled={actionLoading} className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                    {actionLoading ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Processing...</> : `Pay ₹${selectedPrice.toLocaleString('en-IN')}`}
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
        <span className="text-gray-600 dark:text-gray-300">{label}</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">{used}/{max >= 999 ? '∞' : max}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={cn('h-2 rounded-full transition-all', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-orange-500')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
