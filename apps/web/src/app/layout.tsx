import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ChatWidget } from '@/components/ai/chat-widget';

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
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'ThooviTickets - Discover Amazing Events',
    description: 'Book tickets for concerts, sports, comedy shows and more.',
    type: 'website',
    siteName: 'ThooviTickets',
    images: [{ url: '/Main_logo.svg', width: 256, height: 148, alt: 'ThooviTickets' }],
  },
  twitter: {
    card: 'summary',
    title: 'ThooviTickets - Discover Amazing Events',
    description: 'Book tickets for concerts, sports, comedy shows and more.',
    images: ['/Main_logo.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('thoovitickets-theme');
              if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}} />
      </head>
      <body className="min-h-full flex flex-col bg-linear-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 dark:text-gray-100 antialiased transition-colors">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
