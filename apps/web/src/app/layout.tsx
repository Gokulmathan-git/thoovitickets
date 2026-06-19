import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const geist = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'ThooviTickets - Discover Amazing Events',
    template: '%s | ThooviTickets',
  },
  description:
    'Book tickets for concerts, sports, comedy shows, tech conferences and more. Secure payment, instant digital tickets.',
  keywords: ['events', 'tickets', 'concerts', 'sports', 'booking', 'ThooviTickets'],
  openGraph: {
    title: 'ThooviTickets - Discover Amazing Events',
    description: 'Book tickets for concerts, sports, comedy shows and more.',
    type: 'website',
    siteName: 'ThooviTickets',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 antialiased">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
