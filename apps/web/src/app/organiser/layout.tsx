'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, CalendarPlus, List, BarChart3, CreditCard } from 'lucide-react';

const sidebarLinks = [
  { href: '/organiser/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/organiser/events', label: 'My Events', icon: List },
  { href: '/organiser/events/create', label: 'Create Event', icon: CalendarPlus },
  { href: '/organiser/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/organiser/subscriptions', label: 'Subscription', icon: CreditCard },
];

export default function OrganiserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block">
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900">Organiser Panel</h2>
          <p className="text-sm text-gray-500">Manage your events</p>
        </div>
        <nav className="space-y-1 px-2">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
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
