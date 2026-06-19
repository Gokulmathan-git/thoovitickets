'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { LayoutDashboard, Users, Calendar, ShieldCheck, Tag, CreditCard } from 'lucide-react';

const sidebarLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/plans', label: 'Plans', icon: CreditCard },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" /></div>;
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
          <p className="text-sm text-gray-500">System management</p>
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
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
