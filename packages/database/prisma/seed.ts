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
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
