'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  CalendarPlus,
  BarChart3,
  CreditCard,
  Users,
  Shield,
  Zap,
  Globe,
  Headphones,
  ArrowRight,
  Check,
  Star,
} from 'lucide-react';

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

const features = [
  {
    icon: CalendarPlus,
    title: 'Easy Event Creation',
    description: 'Create and publish events in minutes with our intuitive event builder.',
  },
  {
    icon: CreditCard,
    title: 'Secure Payments',
    description: 'Accept payments via Razorpay with automatic payouts to your account.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Track ticket sales, revenue, and attendee insights from your dashboard.',
  },
  {
    icon: Users,
    title: 'Attendee Management',
    description: 'Manage your attendees, send updates, and handle check-ins seamlessly.',
  },
  {
    icon: Shield,
    title: 'Verified Organisers',
    description: 'Build trust with a verified organiser badge on all your events.',
  },
  {
    icon: Globe,
    title: 'Reach More People',
    description: 'Get discovered by thousands of event-goers browsing ThooviTickets.',
  },
];

const howItWorks = [
  { step: '01', title: 'Create Account', description: 'Register as an organiser and verify your identity.' },
  { step: '02', title: 'Complete Profile', description: 'Add your organisation details and upload ID verification.' },
  { step: '03', title: 'Create Events', description: 'Set up your event with details, tickets, and pricing.' },
  { step: '04', title: 'Start Selling', description: 'Publish your event and start selling tickets instantly.' },
];

export default function BecomeOrganiserPage() {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    apiClient.get('/subscriptions/plans')
      .then((res) => setPlans(res.data.data))
      .catch(() => {});
  }, []);
  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#f97316_0%,_transparent_50%)] opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-4 py-1.5 text-sm font-medium text-orange-400">
              <Zap className="h-4 w-4" />
              Start organising events today
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Bring Your Events to{' '}
              <span className="text-orange-500">Life</span>
            </h1>
            <p className="mt-6 text-lg text-gray-300">
              ThooviTickets gives you everything you need to create, manage, and sell tickets for your events. From small meetups to large concerts — we&apos;ve got you covered.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register?role=organiser">
                <Button size="lg" className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-6 text-base font-semibold rounded-xl">
                  Register as Organiser
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" className="border border-gray-500 bg-transparent text-white hover:bg-white dark:bg-gray-800/10 px-8 py-6 text-base rounded-xl">
                  Explore Features
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-500" /> Free to start
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-500" /> No hidden fees
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-500" /> Instant payouts
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white dark:bg-gray-800 py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl lg:text-4xl">
              Everything You Need to Succeed
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
              Powerful tools to help you create amazing events and grow your audience.
            </p>
          </div>
          <div className="mt-10 sm:mt-16 grid grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 transition-all hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
                    <Icon className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{feature.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 dark:bg-gray-900 py-12 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl lg:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
              Get started in 4 simple steps.
            </p>
          </div>
          <div className="mt-10 sm:mt-16 grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-bold text-white shadow-lg shadow-orange-500/30">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      {plans.length > 0 && (
        <section className="bg-white dark:bg-gray-800 py-12 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl lg:text-4xl">
                Simple, Transparent Pricing
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
                Start for free, upgrade as you grow.
              </p>
            </div>
            <div className={`mt-10 sm:mt-16 grid grid-cols-1 gap-6 sm:gap-8 ${plans.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
              {plans.map((plan) => {
                const isPopular = plan.tier === 'PRO';
                const price = Number(plan.price);

                return (
                  <div
                    key={plan.tier}
                    className={`rounded-2xl border p-8 flex flex-col ${
                      isPopular
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 shadow-lg shadow-orange-100/50 relative'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                        <Star className="h-3 w-3" /> Popular
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`}
                      </span>
                      {price > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">/month</span>}
                    </div>
                    <ul className="mt-6 space-y-3 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Check className="h-4 w-4 mt-0.5 text-orange-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link href="/register?role=organiser" className="mt-8 block">
                      <Button
                        className={`w-full rounded-xl py-5 ${
                          isPopular
                            ? 'bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                            : 'bg-gray-900 hover:bg-gray-800 text-white'
                        }`}
                      >
                        Get Started
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-gray-900 py-12 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Ready to Start Organising?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
            Join thousands of organisers who trust ThooviTickets to power their events.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register?role=organiser">
              <Button size="lg" className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-8 py-6 text-base font-semibold rounded-xl w-full sm:w-auto">
                Register Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/events">
              <Button size="lg" className="border border-gray-500 bg-transparent text-white hover:bg-white dark:bg-gray-800/10 px-8 py-6 text-base rounded-xl w-full sm:w-auto">
                Browse Events
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Headphones className="h-4 w-4" />
            Need help? Contact us at support@thoovitickets.com
          </div>
        </div>
      </section>
    </div>
  );
}
