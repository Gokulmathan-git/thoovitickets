'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Plan {
  tier: string;
  name: string;
  price: number;
  maxEvents: number;
  maxTickets: number;
  features: string[];
}

interface Subscription {
  id: string;
  tier: string;
  status: string;
  maxEvents: number;
  maxTickets: number;
  startDate: string;
  endDate: string | null;
}

interface Usage {
  used: number;
  max: number;
  tier: string;
}

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/subscriptions/plans'),
      apiClient.get('/subscriptions/my'),
      apiClient.get('/subscriptions/usage'),
    ])
      .then(([plansRes, subRes, usageRes]) => {
        setPlans(plansRes.data.data);
        setCurrent(subRes.data.data);
        setUsage(usageRes.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (tier: string) => {
    setSubscribing(tier);
    try {
      const res = await apiClient.post('/subscriptions', { tier });
      setCurrent(res.data.data);
      const usageRes = await apiClient.get('/subscriptions/usage');
      setUsage(usageRes.data.data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to subscribe');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You will be moved to the Free plan.')) return;
    try {
      const res = await apiClient.post('/subscriptions/cancel');
      setCurrent(res.data.data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to cancel');
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-200" />)}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Subscription</h1>

      {/* Current Plan + Usage */}
      {current && usage && (
        <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Current Plan</p>
              <p className="text-xl font-bold text-blue-900">{current.tier}</p>
              <p className="mt-1 text-sm text-blue-700">
                Events this month: {usage.used} / {usage.max}
              </p>
              {current.endDate && (
                <p className="text-xs text-blue-500">
                  Expires: {new Date(current.endDate).toLocaleDateString('en-IN', { dateStyle: 'long' })}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="h-16 w-16 rounded-full border-4 border-blue-200 flex items-center justify-center">
                <span className="text-lg font-bold text-blue-700">{usage.used}/{usage.max}</span>
              </div>
              {current.tier !== 'FREE' && (
                <Button variant="ghost" size="sm" className="mt-2 text-xs text-red-500" onClick={handleCancel}>
                  Cancel Plan
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Available Plans</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrentPlan = current?.tier === plan.tier;
          const isPopular = plan.tier === 'PREMIUM';

          return (
            <Card
              key={plan.tier}
              className={cn(
                'relative',
                isCurrentPlan && 'border-blue-500 ring-2 ring-blue-200',
                isPopular && !isCurrentPlan && 'border-purple-300',
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-purple-600 px-3 py-0.5 text-xs font-medium text-white">
                  Popular
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="mt-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-gray-900">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900">₹{plan.price.toLocaleString('en-IN')}</span>
                      <span className="text-sm text-gray-500">/month</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {isCurrentPlan ? (
                    <Button className="w-full" variant="outline" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? 'default' : 'outline'}
                      onClick={() => handleSubscribe(plan.tier)}
                      disabled={subscribing === plan.tier}
                    >
                      {subscribing === plan.tier ? 'Subscribing...' : plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Payment for subscriptions will be integrated with Razorpay. Currently, plan changes are instant.
      </p>
    </div>
  );
}
