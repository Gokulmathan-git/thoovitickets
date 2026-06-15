'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trash2, Minus, Plus } from 'lucide-react';

export default function CartPage() {
  const { items, total, setCart, clearCart, isGuest, updateGuestItem, removeGuestItem, loadGuestCart } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      apiClient
        .get('/cart')
        .then((res) => {
          const data = res.data.data;
          setCart(data.items, data.total, data.itemCount);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      loadGuestCart();
      setLoading(false);
    }
  }, [user, setCart, loadGuestCart]);

  const updateQuantity = async (item: typeof items[0], quantity: number) => {
    setUpdating(item.id);
    try {
      if (user && !isGuest) {
        const res = await apiClient.patch(`/cart/items/${item.id}`, { quantity });
        const data = res.data.data;
        setCart(data.items, data.total, data.itemCount);
      } else {
        updateGuestItem(item.ticketType.id, quantity);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      alert(axiosError.response?.data?.error?.message || 'Failed to update');
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (item: typeof items[0]) => {
    setUpdating(item.id);
    try {
      if (user && !isGuest) {
        const res = await apiClient.delete(`/cart/items/${item.id}`);
        const data = res.data.data;
        setCart(data.items, data.total, data.itemCount);
      } else {
        removeGuestItem(item.ticketType.id);
      }
    } finally {
      setUpdating(null);
    }
  };

  const handleClearCart = () => {
    if (!confirm('Clear all items from cart?')) return;
    if (user && !isGuest) {
      apiClient.delete('/cart').then(() => clearCart());
    } else {
      clearCart();
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" className="text-red-600" onClick={handleClearCart}>
            Clear Cart
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg text-gray-500">Your cart is empty</p>
            <p className="mt-1 text-sm text-gray-400">Browse events and add tickets to get started</p>
            <Link href="/events">
              <Button className="mt-4 bg-orange-500 hover:bg-orange-600">Browse Events</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 flex-shrink-0 rounded-md overflow-hidden">
                    <img src={item.event.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=200&q=80'} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/events/${item.event.slug}`} className="font-semibold text-gray-900 hover:text-orange-600">
                      {item.event.title}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {item.ticketType.name} &middot; {item.event.venue}, {item.event.city}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.event.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      ₹{(item.ticketType.price * item.quantity).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-500">
                      ₹{item.ticketType.price.toLocaleString('en-IN')} each
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-md border border-gray-300">
                      <button
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                        disabled={item.quantity <= 1 || updating === item.id}
                        onClick={() => updateQuantity(item, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-3 text-sm font-medium">{item.quantity}</span>
                      <button
                        className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                        disabled={item.quantity >= Math.min(item.ticketType.maxPerOrder, item.ticketType.available) || updating === item.id}
                        onClick={() => updateQuantity(item, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-xs text-gray-400">{item.ticketType.available} left</span>
                  </div>
                  <button className="text-red-500 hover:text-red-700 disabled:opacity-30" onClick={() => removeItem(item)} disabled={updating === item.id}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} tickets)</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <Link href="/checkout">
                <Button className="w-full mt-4 bg-orange-500 hover:bg-orange-600" size="lg">
                  Proceed to Checkout
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
