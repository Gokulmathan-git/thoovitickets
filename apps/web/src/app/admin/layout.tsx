'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { LayoutDashboard, Users, Calendar, ShieldCheck, Tag, CreditCard, FileText, IndianRupee, MessageSquare } from 'lucide-react';

const sidebarLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquare },
  { href: '/admin/plans', label: 'Plans', icon: CreditCard },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/fees', label: 'Fees', icon: IndianRupee },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && !isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, isLoading, _hasHydrated, router]);

  if (!_hasHydrated || isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" /></div>;
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200/80 dark:border-gray-800 bg-linear-to-b from-white to-gray-50/30 dark:from-gray-900 dark:to-gray-950 lg:block">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Admin Panel</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">System management</p>
        </div>
        <nav className="space-y-1 px-2">
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
      </aside>

      <div className="flex-1 bg-gray-50 dark:bg-gray-900">
        {/* Mobile top nav */}
        <div className="overflow-x-auto border-b border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 lg:hidden">
          <nav className="flex gap-1 px-2 py-2">
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
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
