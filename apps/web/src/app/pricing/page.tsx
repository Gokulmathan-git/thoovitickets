'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Check, Star } from 'lucide-react';

interface Plan {
  tier: string;
  name: string;
  price: number;
  maxEventsPerMonth: number;
  maxTicketTiers: number;
  maxTicketsPerEvent: number;
  maxStaffAccounts: number;
  commissionPercent: number;
  features: string[];
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/subscriptions/plans')
      .then((res) => setPlans(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-80 animate-pulse rounded-xl bg-gray-200" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-gray-900 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold text-white">
            Simple, Transparent <span className="text-orange-400">Pricing</span>
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            Choose the plan that fits your event organising needs. Start free, upgrade as you grow.
          </p>
        </div>
      </div>

      {/* Plans */}
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const isPopular = plan.tier === 'PRO';
            const price = Number(plan.price);

            return (
              <Card
                key={plan.tier}
                className={`relative flex flex-col ${isPopular ? 'border-orange-400 ring-2 ring-orange-200 shadow-lg' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-orange-500 px-4 py-1 text-xs font-bold text-white">
                    <Star className="h-3 w-3" /> Popular
                  </div>
                )}
                <CardHeader className="pb-2 pt-6">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="mt-2">
                    {price === 0 ? (
                      <span className="text-4xl font-bold text-gray-900">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-gray-900">₹{price.toLocaleString('en-IN')}</span>
                        <span className="text-sm text-gray-500">/month</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 pt-4">
                  <ul className="space-y-3 text-sm flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/become-organiser" className="mt-6 block">
                    <Button
                      className={`w-full ${isPopular ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
                      variant={isPopular ? 'default' : 'outline'}
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'Can I start for free?', a: 'Yes! The Free plan lets you create up to 2 events per month with 300 tickets. No credit card required.' },
              { q: 'Can I upgrade or downgrade anytime?', a: 'Absolutely. You can change your plan at any time from the organiser dashboard. Changes take effect immediately.' },
              { q: 'What payment methods do you accept?', a: 'We accept all major payment methods through Razorpay — credit cards, debit cards, UPI, net banking, and wallets.' },
              { q: 'Are there any hidden fees?', a: 'No hidden fees. A small platform service charge applies to ticket sales. Higher plans enjoy lower service charges.' },
            ].map((faq) => (
              <div key={faq.q} className="rounded-lg border border-gray-200 bg-white p-5">
                <p className="font-medium text-gray-900">{faq.q}</p>
                <p className="mt-2 text-sm text-gray-500">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
