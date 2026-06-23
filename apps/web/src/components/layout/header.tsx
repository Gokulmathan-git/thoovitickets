'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import apiClient from '@/lib/api-client';
import { ShoppingCart, Menu, X, Bell, User, ChevronDown, Crown } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { MAIN_LOGO } from '@/lib/logos';

export function Header() {
  const { logout } = useAuth();
  const { user, isLoading } = useAuthStore();
  const cartCount = useCartStore((s) => s.itemCount);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'ORGANISER') return;
    apiClient.get('/subscriptions/my')
      .then((res) => setSubscriptionTier(res.data.data?.tier || 'FREE'))
      .catch(() => setSubscriptionTier('FREE'));
  }, [user]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/80 dark:border-gray-800 bg-linear-to-r from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href={user?.role === 'ORGANISER' ? '/organiser/dashboard' : user?.role === 'ADMIN' ? '/admin/dashboard' : '/'} className="flex items-center" onClick={closeMobile}>
            <img src={MAIN_LOGO} alt="ThooviTickets" className="h-[70px] w-auto" />
          </Link>

          {!isLoading && user?.role !== 'ORGANISER' && user?.role !== 'ADMIN' && (
            <nav className="hidden items-center gap-6 md:flex">
              <Link href="/events" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors">
                Events
              </Link>
              <Link href="/about" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors">
                About Us
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors">
                Pricing
              </Link>
            </nav>
          )}
        </div>

        {/* Right: Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-20 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
              <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          ) : user ? (
            <>
              {/* Cart (customers) */}
              {user.role === 'CUSTOMER' && (
                <Link href="/cart" className="relative">
                  <Button variant="ghost" size="icon" className="text-gray-600">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs text-white">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                </Link>
              )}

              {/* Organiser/Admin links */}
              {user.role === 'ORGANISER' && (
                <>
                  <Link href="/organiser/dashboard">
                    <Button variant="ghost" size="sm" className="text-gray-600">Dashboard</Button>
                  </Link>
                  <Link href="/organiser/subscriptions" className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs font-semibold transition-colors hover:bg-gray-50">
                    <Crown className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-gray-700">{subscriptionTier || 'FREE'}</span>
                  </Link>
                </>
              )}
              {user.role === 'ADMIN' && (
                <Link href="/admin/dashboard">
                  <Button variant="ghost" size="sm" className="text-gray-600">Admin</Button>
                </Link>
              )}

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 py-1.5 pl-3 pr-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                    {user.firstName[0]}
                  </span>
                  <span className="hidden lg:inline">{user.firstName}</span>
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg">
                      <div className="border-b border-gray-100 dark:border-gray-700 px-4 py-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                      <Link href="/profile" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700">
                        Profile
                      </Link>
                      {user.role === 'CUSTOMER' && (
                        <Link href="/orders" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          My Orders
                        </Link>
                      )}
                      <button
                        onClick={() => { setProfileOpen(false); logout(); }}
                        className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-700">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="sm">Sign Up</Button>
              </Link>
            </>
          )}

          <ThemeToggle />

          {!isLoading && user?.role !== 'ORGANISER' && user?.role !== 'ADMIN' && (
            <Link href={'/become-organiser'}>
              <Button size="sm" className="bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                Create Event
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile: Cart + Theme + Hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          {user?.role === 'CUSTOMER' && (
            <Link href="/cart" className="relative">
              <Button variant="ghost" size="icon" className="text-gray-600">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs text-white">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {user?.role !== 'ORGANISER' && user?.role !== 'ADMIN' && (
              <>
                <Link href="/events" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  Events
                </Link>
                <Link href="/about" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  About Us
                </Link>
                <Link href="/pricing" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  Pricing
                </Link>
              </>
            )}

            <div className="my-2 border-t border-gray-100 dark:border-gray-700" />

            {user ? (
              <>
                {user.role === 'CUSTOMER' && (
                  <Link href="/orders" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    My Orders
                  </Link>
                )}
                {user.role === 'ORGANISER' && (
                  <>
                    <Link href="/organiser/dashboard" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                      Organiser Dashboard
                    </Link>
                    <Link href="/organiser/subscriptions" onClick={closeMobile} className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <Crown className="h-4 w-4 text-orange-500" />
                      Plan: {subscriptionTier || 'FREE'}
                    </Link>
                  </>
                )}
                {user.role === 'ADMIN' && (
                  <Link href="/admin/dashboard" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                    Admin Panel
                  </Link>
                )}
                <Link href="/profile" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  Profile
                </Link>
                <button
                  onClick={() => { logout(); closeMobile(); }}
                  className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  Sign In
                </Link>
                <Link href="/register" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20">
                  Sign Up
                </Link>
              </>
            )}

            {!isLoading && user?.role !== 'ORGANISER' && user?.role !== 'ADMIN' && (
              <>
                <div className="my-2 border-t border-gray-100" />
                <Link href="/become-organiser" onClick={closeMobile}>
                  <Button className="w-full bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">Create Event</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
