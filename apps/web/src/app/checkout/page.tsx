'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import type { AttendeeInfo } from '@/components/events/attendee-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, attendees, setCart, isGuest, clearCart, loadGuestCart } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'review' | 'paying'>('review');

  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });

  const isGuestCheckout = !user;

  useEffect(() => {
    if (user) {
      apiClient
        .get('/cart')
        .then((res) => {
          const data = res.data.data;
          setCart(data.items, data.total, data.itemCount);
          if (data.items.length === 0) router.push('/cart');
        })
        .catch(() => router.push('/cart'))
        .finally(() => setLoading(false));
    } else {
      loadGuestCart();
      setLoading(false);
    }
  }, [user, setCart, loadGuestCart, router]);

  useEffect(() => {
    if (!loading && items.length === 0) router.push('/cart');
  }, [loading, items.length, router]);

  const handlePlaceOrder = async () => {
    if (isGuestCheckout) {
      if (!guestInfo.email || !guestInfo.name) {
        setError('Please enter your name and email');
        return;
      }
    }

    setPlacing(true);
    setError(null);
    setPaymentStep('paying');

    try {
      let orderId: string;

      if (isGuestCheckout) {
        // Guest checkout — create order directly from items
        const orderRes = await apiClient.post('/orders/guest', {
          guestEmail: guestInfo.email,
          guestName: guestInfo.name,
          guestPhone: guestInfo.phone || undefined,
          items: items.map((item) => ({
            ticketTypeId: item.ticketType.id,
            quantity: item.quantity,
          })),
        });
        const order = orderRes.data.data;
        orderId = order.id;

        // Confirm guest order (simulated payment)
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await apiClient.post(`/orders/guest/${orderId}/confirm`, {
          guestEmail: guestInfo.email,
        });
      } else {
        // Logged-in checkout — create from server cart
        const orderRes = await apiClient.post('/orders', {});
        const order = orderRes.data.data;
        orderId = order.id;

        // Initiate payment
        const payRes = await apiClient.post(`/payments/initiate/${orderId}`);
        const paymentInfo = payRes.data.data;

        if (paymentInfo.provider === 'razorpay' && paymentInfo.keyId) {
          await openRazorpayCheckout(orderId, paymentInfo);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          await apiClient.post(`/payments/verify/${orderId}`, {
            providerPaymentId: `mock_pay_${Date.now()}`,
            providerOrderId: paymentInfo.providerOrderId,
            providerSignature: 'mock_valid_signature',
          });
        }
      }

      clearCart();

      if (isGuestCheckout) {
        // Guest can't view /orders/:id (requires auth), show success inline
        setPaymentStep('review');
        setPlacing(false);
        router.push(`/checkout/success?order=${orderId}&email=${encodeURIComponent(guestInfo.email)}`);
      } else {
        router.push(`/orders/${orderId}`);
      }
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Payment failed. Please try again.');
      setPlacing(false);
      setPaymentStep('review');
    }
  };

  const openRazorpayCheckout = async (orderId: string, paymentInfo: { providerOrderId: string; amount: number; currency: string; keyId?: string; orderNumber: string; prefill: { name: string; email: string; contact: string } }) => {
    return new Promise<void>((resolve, reject) => {
      const win = window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } };
      if (!win.Razorpay) { reject(new Error('Razorpay SDK not loaded')); return; }
      const rzp = new win.Razorpay({
        key: paymentInfo.keyId,
        amount: paymentInfo.amount * 100,
        currency: paymentInfo.currency,
        name: 'ThooviTickets',
        description: `Order #${paymentInfo.orderNumber}`,
        order_id: paymentInfo.providerOrderId,
        prefill: paymentInfo.prefill,
        theme: { color: '#f97316' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await apiClient.post(`/payments/verify/${orderId}`, {
              providerPaymentId: response.razorpay_payment_id,
              providerOrderId: response.razorpay_order_id,
              providerSignature: response.razorpay_signature,
            });
            resolve();
          } catch (err) { reject(err); }
        },
        modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
      });
      rzp.open();
    });
  };

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-8"><div className="h-64 animate-pulse rounded-lg bg-gray-200" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {paymentStep === 'paying' && (
        <div className="mb-4 rounded-md bg-orange-50 p-4 text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
          <p className="font-medium text-orange-700">Processing payment...</p>
          <p className="text-sm text-orange-500">Please do not close this page</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isGuestCheckout ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Enter your details to receive the tickets</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      placeholder="John Doe"
                      value={guestInfo.name}
                      onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone (Optional)</Label>
                  <Input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={guestInfo.phone}
                    onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{user?.email}</p>
                </div>
                {user?.phone && (
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{user.phone}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{item.event.title}</p>
                    <p className="text-sm text-gray-500">{item.ticketType.name} x {item.quantity}</p>
                  </div>
                  <p className="font-medium text-gray-900">₹{(item.ticketType.price * item.quantity).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Attendee Info */}
        {attendees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attendee Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attendees.map((att: AttendeeInfo, i: number) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-xs font-bold text-orange-600 shrink-0">
                      {i + 1}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">{att.name}</p>
                      <p className="text-gray-500">{att.email} · {att.phone}</p>
                      <p className="text-xs text-orange-500">{att.ticketName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Convenience Fee</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-lg">
                <span>Total</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <Button
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600"
              size="lg"
              onClick={handlePlaceOrder}
              disabled={placing || (isGuestCheckout && (!guestInfo.email || !guestInfo.name))}
            >
              {placing ? 'Processing...' : `Pay ₹${total.toLocaleString('en-IN')}`}
            </Button>

            <div className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-400">
              <ShieldCheck className="h-3 w-3" />
              Secure payment processing
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
