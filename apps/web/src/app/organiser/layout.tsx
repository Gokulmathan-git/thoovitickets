'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { LayoutDashboard, CalendarPlus, List, BarChart3, CreditCard, Users, Menu, X, User, LogOut } from 'lucide-react';
import { useState } from 'react';

const sidebarLinks = [
  { href: '/organiser/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/organiser/events', label: 'My Events', icon: List },
  { href: '/organiser/events/create', label: 'Create Event', icon: CalendarPlus },
  { href: '/organiser/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/organiser/staff', label: 'Staff', icon: Users },
  { href: '/organiser/subscriptions', label: 'Subscription', icon: CreditCard },
];

const footerLinks = [
  { href: '/organiser/privacy-policy', label: 'Privacy Policy' },
  { href: '/organiser/terms-of-service', label: 'Terms of Service' },
  { href: '/organiser/refund-policy', label: 'Refund Policy' },
  { href: '/organiser/support', label: 'Support' },
];

export default function OrganiserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, _hasHydrated } = useAuthStore();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (_hasHydrated && !isLoading && (!user || user.role !== 'ORGANISER')) {
      router.push('/login');
    }
  }, [user, isLoading, _hasHydrated, router]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!_hasHydrated || isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" /></div>;
  }

  if (!user || user.role !== 'ORGANISER') return null;

  const sidebarContent = (
    <>
      <nav className="flex-1 space-y-1 px-2">
        {sidebarLinks.map((link) => {
          const hasMoreSpecificMatch = sidebarLinks.some(
            (other) => other.href !== link.href && other.href.startsWith(link.href + '/') && (pathname === other.href || pathname.startsWith(other.href + '/')),
          );
          const isActive = !hasMoreSpecificMatch && (pathname === link.href || pathname.startsWith(link.href + '/'));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
              )}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200/80 dark:border-gray-800 px-2 py-3 space-y-1">
        <Link
          href="/organiser/profile"
          onClick={() => setMobileMenuOpen(false)}
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/organiser/profile'
              ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
          )}
        >
          <User className="h-5 w-5" />
          Profile
        </Link>
        <button
          onClick={() => { setMobileMenuOpen(false); logout(); }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Mobile menu button */}
      <div className="fixed bottom-4 right-4 z-40 lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Organiser Panel</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your events</p>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200/80 dark:border-gray-800 bg-linear-to-b from-white to-gray-50/30 dark:from-gray-900 dark:to-gray-950 lg:flex lg:flex-col overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Organiser Panel</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your events</p>
        </div>
        {sidebarContent}
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            {children}
          </div>
        </div>

        {/* Footer — always fixed at bottom */}
        <footer className="shrink-0 border-t border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 py-2.5">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center text-xs text-gray-400 dark:text-gray-500">
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span>&copy; {new Date().getFullYear()} ThooviTickets.</span>
              <span>&middot;</span>
              <span>Powered by{' '}
                <a href="https://thoovicreations.com" target="_blank" rel="noopener noreferrer" className="font-medium text-orange-500 hover:text-orange-600 transition-colors">
                  Thoovicreations
                </a>
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {footerLinks.map((link, i) => (
                <span key={link.href} className="flex items-center gap-x-3">
                  {i > 0 && <span>&middot;</span>}
                  <Link href={link.href} className="hover:text-gray-600 dark:hover:text-gray-300">{link.label}</Link>
                </span>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
