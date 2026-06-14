export const SUBSCRIPTION_PLANS = {
  FREE: {
    tier: 'FREE' as const,
    name: 'Free',
    price: 0,
    maxEvents: 2,
    maxTickets: 100,
    features: ['Up to 2 events per month', 'Up to 100 tickets per event', 'Basic analytics'],
  },
  BASIC: {
    tier: 'BASIC' as const,
    name: 'Basic',
    price: 999,
    maxEvents: 10,
    maxTickets: 500,
    features: ['Up to 10 events per month', 'Up to 500 tickets per event', 'Detailed analytics', 'Priority support'],
  },
  PREMIUM: {
    tier: 'PREMIUM' as const,
    name: 'Premium',
    price: 2999,
    maxEvents: 50,
    maxTickets: 5000,
    features: ['Up to 50 events per month', 'Up to 5000 tickets per event', 'Advanced analytics', 'Featured events', 'Priority support'],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE' as const,
    name: 'Enterprise',
    price: 9999,
    maxEvents: 999,
    maxTickets: 50000,
    features: ['Unlimited events', 'Up to 50,000 tickets per event', 'Custom analytics', 'Dedicated support', 'Featured events', 'Custom branding'],
  },
} as const;

export type PlanTier = keyof typeof SUBSCRIPTION_PLANS;
