'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { ShoppingCart, Menu, X, Bell, User, ChevronDown } from 'lucide-react';

export function Header() {
  const { logout } = useAuth();
  const { user, isLoading } = useAuthStore();
  const cartCount = useCartStore((s) => s.itemCount);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center" onClick={closeMobile}>
            <span className="text-xl font-bold text-orange-500">ThooviTickets</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/events" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              Events
            </Link>
            <Link href="/about" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              About Us
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-700 hover:text-orange-500 transition-colors">
              Pricing
            </Link>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-md bg-gray-200" />
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
                <Link href="/organiser/dashboard">
                  <Button variant="ghost" size="sm" className="text-gray-600">Dashboard</Button>
                </Link>
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
                  className="flex items-center gap-2 rounded-full border border-gray-200 py-1.5 pl-3 pr-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      <div className="border-b border-gray-100 px-4 py-2">
                        <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                      <Link href="/profile" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
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

          {/* Create Event — always visible */}
          <Link href={user?.role === 'ORGANISER' ? '/organiser/events/create' : '/register?role=organiser'}>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
              Create Event
            </Button>
          </Link>
        </div>

        {/* Mobile: Cart + Hamburger */}
        <div className="flex items-center gap-2 md:hidden">
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
        <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link href="/events" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Events
            </Link>
            <Link href="/about" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
              About Us
            </Link>
            <Link href="/pricing" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Pricing
            </Link>

            <div className="my-2 border-t border-gray-100" />

            {user ? (
              <>
                {user.role === 'CUSTOMER' && (
                  <Link href="/orders" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                    My Orders
                  </Link>
                )}
                {user.role === 'ORGANISER' && (
                  <Link href="/organiser/dashboard" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                    Organiser Dashboard
                  </Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link href="/admin/dashboard" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                    Admin Panel
                  </Link>
                )}
                <Link href="/profile" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  Profile
                </Link>
                <button
                  onClick={() => { logout(); closeMobile(); }}
                  className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  Sign In
                </Link>
                <Link href="/register" onClick={closeMobile} className="rounded-md px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50">
                  Sign Up
                </Link>
              </>
            )}

            <div className="my-2 border-t border-gray-100" />
            <Link href={user?.role === 'ORGANISER' ? '/organiser/events/create' : '/register?role=organiser'} onClick={closeMobile}>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">Create Event</Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
