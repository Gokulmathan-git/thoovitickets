'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();

  const isAdmin = pathname.startsWith('/admin');
  const isOrganiser = pathname.startsWith('/organiser');

  if (isAdmin) return null;

  if (isOrganiser) {
    return (
      <footer className="border-t border-gray-200/80 dark:border-gray-800 bg-linear-to-b from-white to-gray-50/30 dark:from-gray-900 dark:to-gray-950 py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-400 dark:text-gray-500">
          &copy; {new Date().getFullYear()} ThooviTickets. All rights reserved. &middot; Powered by{' '}
          <a href="https://thoovicreations.com" target="_blank" rel="noopener noreferrer" className="font-medium text-orange-500 hover:text-orange-600 transition-colors">
            Thoovicreations
          </a>
          {' '}&middot;{' '}
          <a href="/about" className="hover:text-gray-600 dark:hover:text-gray-300">About</a>
          {' '}&middot;{' '}
          <a href="#" className="hover:text-gray-600 dark:hover:text-gray-300">Support</a>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-gray-200/80 dark:border-gray-800 bg-linear-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-950 pt-8 sm:pt-12 pb-6 sm:pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image src="/Main_logo.svg" alt="ThooviTickets" width={280} height={65} className="h-16 w-auto" />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              The world&apos;s premier platform for extraordinary experiences.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Quick Links</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="/events" className="hover:text-gray-700 dark:hover:text-gray-200">Discover</a></li>
              <li><a href="/about" className="hover:text-gray-700 dark:hover:text-gray-200">About Us</a></li>
              <li><a href="/pricing" className="hover:text-gray-700 dark:hover:text-gray-200">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="/contact-support" className="hover:text-gray-700 dark:hover:text-gray-200">Contact Support</a></li>
              <li><a href="/privacy-policy" className="hover:text-gray-700 dark:hover:text-gray-200">Privacy Policy</a></li>
              <li><a href="/terms-of-service" className="hover:text-gray-700 dark:hover:text-gray-200">Terms of Service</a></li>
              <li><a href="/refund-policy" className="hover:text-gray-700 dark:hover:text-gray-200">Refund Policy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">For Organisers</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li><a href="/become-organiser" className="hover:text-gray-700 dark:hover:text-gray-200">Create Event</a></li>
              <li><a href="/pricing" className="hover:text-gray-700 dark:hover:text-gray-200">Plans & Pricing</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          &copy; {new Date().getFullYear()} ThooviTickets. All rights reserved. &middot; Powered by{' '}
          <a href="https://thoovicreations.com" target="_blank" rel="noopener noreferrer" className="font-medium text-orange-500 hover:text-orange-600 transition-colors">
            Thoovicreations
          </a>
        </div>
      </div>
    </footer>
  );
}
