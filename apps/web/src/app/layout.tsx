import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';

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
      <body className="min-h-full flex flex-col bg-gray-50 antialiased">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-gray-200 bg-white py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <p className="text-sm text-gray-500">
                  &copy; {new Date().getFullYear()} ThooviTickets. All rights reserved.
                </p>
                <div className="flex gap-6 text-sm text-gray-500">
                  <a href="/events" className="hover:text-gray-700">Events</a>
                  <a href="/register" className="hover:text-gray-700">Organise</a>
                </div>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
