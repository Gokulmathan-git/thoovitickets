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

  const firstAttendee = attendees.length > 0 ? attendees[0] : null;
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });
  const [priceBreakdown, setPriceBreakdown] = useState<{
    subtotal: number;
    convenienceFee: number;
    platformFee: number;
    totalAmount: number;
  } | null>(null);

  const isGuestCheckout = !user;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!user && firstAttendee && !guestInfo.name) {
      setGuestInfo({ name: firstAttendee.name, email: firstAttendee.email, phone: firstAttendee.phone || '' });
    }
  }, [user, firstAttendee, guestInfo.name]);

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

  useEffect(() => {
    if (items.length === 0) return;
    apiClient
      .post('/orders/price-breakdown', {
        items: items.map((item) => ({
          ticketTypeId: item.ticketType.id,
          quantity: item.quantity,
        })),
      })
      .then((res) => setPriceBreakdown(res.data.data))
      .catch(() => {
        // Fallback: show subtotal as total with zero fees
        setPriceBreakdown({ subtotal: total, convenienceFee: 0, platformFee: 0, totalAmount: total });
      });
  }, [items, total]);

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
        const orderRes = await apiClient.post('/orders/guest', {
          guestEmail: guestInfo.email,
          guestName: guestInfo.name,
          guestPhone: guestInfo.phone || undefined,
          items: items.map((item) => ({
            ticketTypeId: item.ticketType.id,
            quantity: item.quantity,
          })),
          attendees: attendees.map((a) => ({
            ticketTypeId: a.ticketTypeId,
            name: a.name,
            email: a.email,
            phone: a.phone,
          })),
        });
        const order = orderRes.data.data;
        orderId = order.id;

        const orderAmount = priceBreakdown?.totalAmount ?? total;
        if (orderAmount > 0) {
          const payRes = await apiClient.post(`/payments/guest/initiate/${orderId}`, {
            guestEmail: guestInfo.email,
          });
          const paymentInfo = payRes.data.data;

          if (paymentInfo.provider === 'razorpay' && paymentInfo.keyId) {
            await openRazorpayCheckout(orderId, paymentInfo, guestInfo.email);
          } else {
            await apiClient.post(`/orders/guest/${orderId}/confirm`, {
              guestEmail: guestInfo.email,
            });
          }
        } else {
          await apiClient.post(`/orders/guest/${orderId}/confirm`, {
            guestEmail: guestInfo.email,
          });
        }
      } else {
        // Logged-in checkout — create from server cart
        const orderRes = await apiClient.post('/orders', {
          attendees: attendees.map((a) => ({
            ticketTypeId: a.ticketTypeId,
            name: a.name,
            email: a.email,
            phone: a.phone,
          })),
        });
        const order = orderRes.data.data;
        orderId = order.id;

        // Check if payment is needed (skip for free orders)
        const orderAmount = priceBreakdown?.totalAmount ?? total;
        if (orderAmount > 0) {
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
        } else {
          await apiClient.post(`/orders/${orderId}/confirm`);
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
      console.error('Checkout error:', err);
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = axiosError.response?.data?.error?.message || (err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setError(msg);
      setPlacing(false);
      setPaymentStep('review');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openRazorpayCheckout = async (orderId: string, paymentInfo: { providerOrderId: string; amount: number; currency: string; keyId?: string; orderNumber: string; prefill: { name: string; email: string; contact: string } }, guestEmail?: string) => {
    const win = window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } };

    // Wait for Razorpay SDK to load (max 5 seconds)
    if (!win.Razorpay) {
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 500));
        if (win.Razorpay) break;
      }
    }

    if (!win.Razorpay) {
      throw new Error('Payment gateway failed to load. Please refresh and try again.');
    }

    return new Promise<void>((resolve, reject) => {
      const rzp = new win.Razorpay!({
        key: paymentInfo.keyId,
        amount: paymentInfo.amount * 100,
        currency: paymentInfo.currency,
        name: 'ThooviTickets',
        description: `Order #${paymentInfo.orderNumber}`,
        image: '/Main_logo.png',
        order_id: paymentInfo.providerOrderId,
        prefill: paymentInfo.prefill,
        theme: { color: '#FF541F' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            const verifyUrl = guestEmail
              ? `/payments/guest/verify/${orderId}`
              : `/payments/verify/${orderId}`;
            await apiClient.post(verifyUrl, {
              providerPaymentId: response.razorpay_payment_id,
              providerOrderId: response.razorpay_order_id,
              providerSignature: response.razorpay_signature,
              ...(guestEmail ? { guestEmail } : {}),
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
    return <div className="mx-auto max-w-3xl px-4 py-8"><div className="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Checkout</h1>

      {error && <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

      {paymentStep === 'paying' && (
        <div className="mb-4 rounded-md bg-orange-50 dark:bg-orange-900/20 p-4 text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
          <p className="font-medium text-orange-700">Processing payment...</p>
          <p className="text-sm text-orange-500">Please do not close this page</p>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Column — Order Details */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{isGuestCheckout ? guestInfo.name : `${user?.firstName} ${user?.lastName}`}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{isGuestCheckout ? guestInfo.email : user?.email}</p>
                </div>
                {(isGuestCheckout ? guestInfo.phone : user?.phone) && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{isGuestCheckout ? guestInfo.phone : user?.phone}</p>
                  </div>
                )}
              </div>
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
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.event.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.ticketType.name} x {item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 shrink-0">₹{(item.ticketType.price * item.quantity).toLocaleString('en-IN')}</p>
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
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/20 text-xs font-bold text-orange-600 shrink-0">
                        {i + 1}
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{att.name}</p>
                        <p className="text-gray-500 dark:text-gray-400">{att.email} · {att.phone}</p>
                        <p className="text-xs text-orange-500">{att.ticketName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column — Payment Summary (sticky) */}
        <div className="w-full lg:w-[360px] shrink-0">
          <div className="sticky top-20">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Subtotal</span>
                    <span>₹{(priceBreakdown?.subtotal ?? total).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Platform Fee</span>
                    {priceBreakdown && priceBreakdown.platformFee > 0 ? (
                      <span>₹{priceBreakdown.platformFee.toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-green-600">Free</span>
                    )}
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-gray-900 dark:text-gray-100 text-lg">
                    <span>Total</span>
                    <span>₹{(priceBreakdown?.totalAmount ?? total).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <Button
                  className="w-full mt-4 bg-linear-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={placing}
                >
                  {placing ? 'Processing...' : `Pay ₹${(priceBreakdown?.totalAmount ?? total).toLocaleString('en-IN')}`}
                </Button>

                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <ShieldCheck className="h-3 w-3" />
                  Secure payment processing
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
