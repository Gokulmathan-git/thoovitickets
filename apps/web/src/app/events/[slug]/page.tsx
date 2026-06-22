import type { Metadata } from 'next';
import EventDetailClient from './event-detail-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface EventMeta {
  title: string;
  slug: string;
  description: string;
  shortDesc: string | null;
  imageUrl: string | null;
  venue: string;
  city: string;
  startDate: string;
  category: { name: string };
  ticketTypes: { price: number }[];
  organiser: { orgName: string | null; firstName: string; lastName: string };
}

async function fetchEvent(slug: string): Promise<EventMeta | null> {
  try {
    const res = await fetch(`${API_URL}/events/detail/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchEvent(slug);

  if (!event) {
    return { title: 'Event Not Found' };
  }

  const startDate = new Date(event.startDate);
  const dateStr = startDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = startDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const lowestPrice = event.ticketTypes.length
    ? Math.min(...event.ticketTypes.map((t) => Number(t.price)))
    : 0;
  const orgName = event.organiser.orgName || `${event.organiser.firstName} ${event.organiser.lastName}`;
  const description =
    event.shortDesc ||
    `${event.title} at ${event.venue}, ${event.city} on ${dateStr} at ${timeStr}. ${lowestPrice === 0 ? 'Free entry' : `Tickets from ₹${lowestPrice}`}. Book now on ThooviTickets!`;
  const eventUrl = `${SITE_URL}/events/${event.slug}`;
  const image = event.imageUrl || `${SITE_URL}/og-default.png`;

  return {
    title: event.title,
    description,
    openGraph: {
      title: `${event.title} | ThooviTickets`,
      description,
      url: eventUrl,
      siteName: 'ThooviTickets',
      type: 'website',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${event.title} | ThooviTickets`,
      description,
      images: [image],
    },
    other: {
      'og:locale': 'en_IN',
      'event:start_date': event.startDate,
      'event:venue': `${event.venue}, ${event.city}`,
      'event:organizer': orgName,
      'event:category': event.category.name,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EventDetailClient slug={slug} />;
}
