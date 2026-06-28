'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { LayoutDashboard, Users, Calendar, ShieldCheck, Tag, CreditCard, FileText, IndianRupee, MessageSquare, User, LogOut, Image, ShoppingCart, Wallet } from 'lucide-react';

const sidebarLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/banners', label: 'Banners', icon: Image },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
  { href: '/admin/plans', label: 'Plans', icon: CreditCard },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/fees', label: 'Fees', icon: IndianRupee },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/settlements', label: 'Settlements', icon: Wallet },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, _hasHydrated } = useAuthStore();
  const { logout } = useAuth();

  useEffect(() => {
    if (_hasHydrated && !isLoading && (!user || user.role !== 'ADMIN')) {
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

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200/80 dark:border-gray-800 bg-linear-to-b from-white to-gray-50/30 dark:from-gray-900 dark:to-gray-950 lg:flex lg:flex-col overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Admin Panel</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">System management</p>
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
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
            href="/admin/profile"
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === '/admin/profile'
                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
            )}
          >
            <User className="h-5 w-5" />
            Profile
          </Link>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        {/* Mobile top nav */}
        <div className="sticky top-0 z-10 border-b border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 lg:hidden">
          <div className="flex items-center justify-between px-2 py-2">
            <nav className="flex gap-1 overflow-x-auto flex-1">
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            </nav>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
