import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const prisma = new PrismaClient();

const categories = [
  { name: 'Music', slug: 'music', icon: '🎵', description: 'Concerts, festivals, and live music events', sortOrder: 1 },
  { name: 'Sports', slug: 'sports', icon: '⚽', description: 'Sporting events, tournaments, and matches', sortOrder: 2 },
  { name: 'Comedy', slug: 'comedy', icon: '😂', description: 'Stand-up comedy shows and improv nights', sortOrder: 3 },
  { name: 'Technology', slug: 'technology', icon: '💻', description: 'Tech conferences, hackathons, and meetups', sortOrder: 4 },
  { name: 'Arts & Theatre', slug: 'arts-theatre', icon: '🎭', description: 'Theatre, dance, and art exhibitions', sortOrder: 5 },
  { name: 'Food & Drink', slug: 'food-drink', icon: '🍕', description: 'Food festivals, wine tastings, and culinary events', sortOrder: 6 },
  { name: 'Business', slug: 'business', icon: '💼', description: 'Business conferences, networking, and workshops', sortOrder: 7 },
  { name: 'Health & Wellness', slug: 'health-wellness', icon: '🧘', description: 'Yoga retreats, fitness events, and wellness workshops', sortOrder: 8 },
  { name: 'Education', slug: 'education', icon: '📚', description: 'Seminars, courses, and educational workshops', sortOrder: 9 },
  { name: 'Other', slug: 'other', icon: '🎪', description: 'Events that don\'t fit other categories', sortOrder: 10 },
];

async function main() {
  // Seed admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@thoovitickets.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });
    console.log(`Admin user created: ${admin.email}`);
  } else {
    console.log('Admin user already exists, skipping.');
  }

  // Seed event categories
  for (const cat of categories) {
    await prisma.eventCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, icon: cat.icon, sortOrder: cat.sortOrder },
      create: cat,
    });
  }
  console.log(`Seeded ${categories.length} event categories.`);

  // Seed platform config
  const configCount = await prisma.platformConfig.count();
  if (configCount === 0) {
    await prisma.platformConfig.create({
      data: { platformFeePercent: 3.00, defaultOrgCommission: 2.00 },
    });
    console.log('Platform config created: 3% platform fee, 2% org commission.');
  }

  // Seed plans
  const plans = [
    {
      tier: 'FREE', name: 'Free', price: 0,
      maxEventsPerMonth: 2, maxTicketTiers: 2, maxTicketsPerEvent: 300, maxStaffAccounts: 1,
      commissionPercent: 4.00, sortOrder: 1,
      features: ['2 events per month', '2 ticket tiers per event', '300 tickets per event', '1 staff account', 'Basic analytics'],
    },
    {
      tier: 'PRO', name: 'Pro', price: 999,
      maxEventsPerMonth: 10, maxTicketTiers: 5, maxTicketsPerEvent: 1000, maxStaffAccounts: 3,
      commissionPercent: 3.00, sortOrder: 2,
      features: ['10 events per month', '5 ticket tiers per event', '1,000 tickets per event', '3 staff accounts', 'Priority support', 'Detailed analytics'],
    },
    {
      tier: 'ADVANCE', name: 'Advance', price: 2999,
      maxEventsPerMonth: 50, maxTicketTiers: 10, maxTicketsPerEvent: 5000, maxStaffAccounts: 10,
      commissionPercent: 2.00, sortOrder: 3,
      features: ['50 events per month', '10 ticket tiers per event', '5,000 tickets per event', '10 staff accounts', 'Advanced analytics', 'Featured events', 'Priority support'],
    },
    {
      tier: 'ENTERPRISE', name: 'Enterprise', price: 9999,
      maxEventsPerMonth: 999, maxTicketTiers: 50, maxTicketsPerEvent: 50000, maxStaffAccounts: 50,
      commissionPercent: 1.00, sortOrder: 4,
      features: ['Unlimited events', 'Unlimited ticket tiers', '50,000 tickets per event', '50 staff accounts', 'Dedicated support', 'Custom branding', 'Full analytics suite'],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    });
  }
  console.log(`Seeded ${plans.length} plans.`);

  // Seed content pages
  const contentPages = [
    { slug: 'privacy-policy', audience: 'customer', title: 'Privacy Policy — Customers', content: '<h2>Privacy Policy for Customers</h2><p>This privacy policy describes how ThooviTickets collects and uses your personal information when you purchase tickets.</p>' },
    { slug: 'privacy-policy', audience: 'organiser', title: 'Privacy Policy — Organisers', content: '<h2>Privacy Policy for Organisers</h2><p>This privacy policy describes how ThooviTickets collects and uses your personal and business information when you use our platform to organise events.</p>' },
    { slug: 'terms-of-service', audience: 'customer', title: 'Terms of Service — Customers', content: '<h2>Terms of Service for Customers</h2><p>By using ThooviTickets to purchase tickets, you agree to these terms and conditions.</p>' },
    { slug: 'terms-of-service', audience: 'organiser', title: 'Terms of Service — Organisers', content: '<h2>Terms of Service for Organisers</h2><p>By using ThooviTickets to create and manage events, you agree to these terms and conditions.</p>' },
    { slug: 'contact-support', audience: 'all', title: 'Contact Support', content: '<h2>Contact Support</h2><p>Need help? Reach out to us.</p><ul><li>Email: support@thoovitickets.com</li><li>Phone: +91 98765 43210</li></ul>' },
    { slug: 'refund-policy', audience: 'all', title: 'Refund Policy', content: '<h2>Refund Policy</h2><p>Refunds are processed within 5-7 business days after an event is cancelled by the organiser.</p>' },
  ];

  for (const page of contentPages) {
    await prisma.contentPage.upsert({
      where: { slug_audience: { slug: page.slug, audience: page.audience } },
      update: {},
      create: page,
    });
  }
  console.log(`Seeded ${contentPages.length} content pages.`);

  // Seed convenience fee slabs
  const slabCount = await prisma.convenienceFeeSlab.count();
  if (slabCount === 0) {
    await prisma.convenienceFeeSlab.createMany({
      data: [
        { minAmount: 1, maxAmount: 500, feeType: 'FIXED', feeValue: 5 },
        { minAmount: 501, maxAmount: 1000, feeType: 'FIXED', feeValue: 10 },
        { minAmount: 1001, maxAmount: null, feeType: 'PERCENTAGE', feeValue: 5 },
      ],
    });
    console.log('Seeded 3 convenience fee slabs.');
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
