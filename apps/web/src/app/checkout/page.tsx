'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

interface PaymentInfo {
  providerOrderId: string;
  amount: number;
  currency: string;
  provider: string;
  keyId?: string;
  orderNumber: string;
  prefill: { name: string; email: string; contact: string };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, setCart } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'review' | 'paying'>('review');

  useEffect(() => {
    apiClient
      .get('/cart')
      .then((res) => {
        const data = res.data.data;
        setCart(data.items, data.total, data.itemCount);
        if (data.items.length === 0) router.push('/cart');
      })
      .finally(() => setLoading(false));
  }, [setCart, router]);

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setError(null);
    setPaymentStep('paying');

    try {
      // Step 1: Create order from cart
      const orderRes = await apiClient.post('/orders', {});
      const order = orderRes.data.data;

      // Step 2: Initiate payment
      const payRes = await apiClient.post(`/payments/initiate/${order.id}`);
      const paymentInfo: PaymentInfo = payRes.data.data;

      if (paymentInfo.provider === 'razorpay' && paymentInfo.keyId) {
        // Real Razorpay checkout
        await openRazorpayCheckout(order.id, paymentInfo);
      } else {
        // Mock provider — simulate payment
        await simulateMockPayment(order.id, paymentInfo);
      }

      setCart([], 0, 0);
      router.push(`/orders/${order.id}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosError.response?.data?.error?.message || 'Payment failed. Please try again.');
      setPlacing(false);
      setPaymentStep('review');
    }
  };

  const simulateMockPayment = async (orderId: string, paymentInfo: PaymentInfo) => {
    // Simulate a brief processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockPaymentId = `mock_pay_${Date.now()}`;
    await apiClient.post(`/payments/verify/${orderId}`, {
      providerPaymentId: mockPaymentId,
      providerOrderId: paymentInfo.providerOrderId,
      providerSignature: 'mock_valid_signature',
    });
  };

  const openRazorpayCheckout = async (orderId: string, paymentInfo: PaymentInfo) => {
    return new Promise<void>((resolve, reject) => {
      const win = window as unknown as { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } };
      if (!win.Razorpay) {
        reject(new Error('Razorpay SDK not loaded. Add the script to your page.'));
        return;
      }

      const rzp = new win.Razorpay({
        key: paymentInfo.keyId,
        amount: paymentInfo.amount * 100,
        currency: paymentInfo.currency,
        name: 'ThooviTickets',
        description: `Order #${paymentInfo.orderNumber}`,
        order_id: paymentInfo.providerOrderId,
        prefill: paymentInfo.prefill,
        theme: { color: '#2563eb' },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await apiClient.post(`/payments/verify/${orderId}`, {
              providerPaymentId: response.razorpay_payment_id,
              providerOrderId: response.razorpay_order_id,
              providerSignature: response.razorpay_signature,
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled by user')),
        },
      });

      rzp.open();
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {paymentStep === 'paying' && (
        <div className="mb-4 rounded-md bg-blue-50 p-4 text-center">
          <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="font-medium text-blue-700">Processing payment...</p>
          <p className="text-sm text-blue-500">Please do not close this page</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Details</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <p className="text-sm text-gray-500">
                      {item.ticketType.name} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-gray-900">
                    ₹{(item.ticketType.price * item.quantity).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
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
              className="w-full mt-4"
              size="lg"
              onClick={handlePlaceOrder}
              disabled={placing}
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
