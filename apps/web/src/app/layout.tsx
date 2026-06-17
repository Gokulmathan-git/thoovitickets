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
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 antialiased">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-gray-200 bg-white pt-12 pb-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
                <div>
                  <span className="text-lg font-bold text-orange-500">ThooviTickets</span>
                  <p className="mt-2 text-xs text-gray-500">
                    The world&apos;s premier platform for extraordinary experiences.
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Quick Links</h4>
                  <ul className="mt-3 space-y-2 text-sm text-gray-500">
                    <li><a href="/events" className="hover:text-gray-700">Discover</a></li>
                    <li><a href="/about" className="hover:text-gray-700">About Us</a></li>
                    <li><a href="/pricing" className="hover:text-gray-700">Pricing</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Support</h4>
                  <ul className="mt-3 space-y-2 text-sm text-gray-500">
                    <li><a href="#" className="hover:text-gray-700">Contact Support</a></li>
                    <li><a href="#" className="hover:text-gray-700">Privacy Policy</a></li>
                    <li><a href="#" className="hover:text-gray-700">Terms of Service</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">For Organisers</h4>
                  <ul className="mt-3 space-y-2 text-sm text-gray-500">
                    <li><a href="/register" className="hover:text-gray-700">Create Event</a></li>
                    <li><a href="/pricing" className="hover:text-gray-700">Plans & Pricing</a></li>
                  </ul>
                </div>
              </div>
              <div className="mt-8 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
                &copy; {new Date().getFullYear()} ThooviTickets. All rights reserved. &middot; Powered by <a href="https://thoovicreations.com" target="_blank" rel="noopener noreferrer" className="font-medium text-orange-500 hover:text-orange-600 transition-colors">Thoovicreations</a>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
