'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';
import { ShoppingCart, Menu, X, User } from 'lucide-react';

export function Header() {
  const { logout } = useAuth();
  const { user, isLoading } = useAuthStore();
  const cartCount = useCartStore((s) => s.itemCount);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" onClick={closeMobile}>
          <span className="text-xl font-bold text-blue-600">ThooviTickets</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-3 md:flex">
          <Link href="/events">
            <Button variant="ghost" size="sm">Events</Button>
          </Link>

          {isLoading ? (
            <div className="h-9 w-20 animate-pulse rounded-md bg-gray-200" />
          ) : user ? (
            <>
              {user.role === 'CUSTOMER' && (
                <>
                  <Link href="/cart" className="relative">
                    <Button variant="ghost" size="icon">
                      <ShoppingCart className="h-5 w-5" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                          {cartCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link href="/orders">
                    <Button variant="ghost" size="sm">Orders</Button>
                  </Link>
                </>
              )}
              {user.role === 'ADMIN' && (
                <Link href="/admin/dashboard">
                  <Button variant="ghost" size="sm">Admin</Button>
                </Link>
              )}
              {user.role === 'ORGANISER' && (
                <Link href="/organiser/dashboard">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
              )}
              <Link href="/profile">
                <Button variant="ghost" size="icon" title="Profile">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          {user?.role === 'CUSTOMER' && (
            <Link href="/cart" className="relative">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
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
          <nav className="flex flex-col gap-2">
            <Link href="/events" onClick={closeMobile} className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Events
            </Link>
            {user ? (
              <>
                {user.role === 'CUSTOMER' && (
                  <Link href="/orders" onClick={closeMobile} className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                    My Orders
                  </Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link href="/admin/dashboard" onClick={closeMobile} className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                    Admin Panel
                  </Link>
                )}
                {user.role === 'ORGANISER' && (
                  <Link href="/organiser/dashboard" onClick={closeMobile} className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                    Organiser Dashboard
                  </Link>
                )}
                <Link href="/profile" onClick={closeMobile} className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  Profile
                </Link>
                <button
                  onClick={() => { logout(); closeMobile(); }}
                  className="rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={closeMobile} className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  Login
                </Link>
                <Link href="/register" onClick={closeMobile} className="rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-700">
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
