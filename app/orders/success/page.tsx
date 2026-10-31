'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Package, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { ErrorState, LoadingMessage } from '@/components/ui-states';

type OrderSummary = {
  id: string;
  order_number?: string;
  subtotal?: number;
  shipping_fee?: number;
  delivery_fee?: number;
  total?: number;
};

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [loadError, setLoadError] = useState('');

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setLoadError('');
    const email = typeof window !== 'undefined' ? sessionStorage.getItem('order_access_email') : null;
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const result = await apiRequest<OrderSummary>(`/api/orders/${orderId}${query}`);
    if (!result.ok) {
      setOrder(null);
      setLoadError(result.message);
      setLoading(false);
      return;
    }
    setOrder(result.data);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    void fetchOrder();
  }, [fetchOrder]);

  if (!orderId) {
    return (
      <ErrorState
        title="We can't find that order"
        description="If you just paid, check your email for the order number, or contact support with your payment reference."
        primary={{ label: 'View my orders', href: '/account/orders' }}
        secondary={{ label: 'Go to home', href: '/' }}
      />
    );
  }

  if (loading) {
    return <LoadingMessage label="Loading order details" className="min-h-screen" />;
  }

  if (loadError || !order) {
    return (
      <ErrorState
        title="We couldn't load this order"
        description={loadError || "Your payment is safe. Try again, or contact support if this keeps happening."}
        primary={{ label: 'Try again', onClick: () => void fetchOrder() }}
        secondary={{ label: 'View my orders', href: '/account/orders' }}
      />
    );
  }

  const shipping = order.shipping_fee || order.delivery_fee || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6 text-center">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-3">Order placed</h1>
          <p className="text-[#3A3A3A] mb-6">
            Thank you. We&apos;ve received your order and will process it shortly.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-[#3A3A3A] mb-2">Order Number</p>
            <p className="text-xl font-bold text-[#FF7A19]">{order.order_number}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Order Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <span className="text-[#3A3A3A]">Subtotal</span>
              <span className="font-semibold text-[#1A1A1A]">GHS {(order.subtotal ?? 0).toFixed(2)}</span>
            </div>
            {shipping > 0 && (
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-[#3A3A3A]">Shipping</span>
                <span className="font-semibold text-[#1A1A1A]">GHS {shipping.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-3 border-t-2 border-gray-300">
              <span className="text-lg font-bold text-[#1A1A1A]">Total</span>
              <span className="text-lg font-bold text-[#FF7A19]">GHS {(order.total ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">What&apos;s next?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-1">Check your email</h3>
                <p className="text-sm text-[#3A3A3A]">
                  We&apos;ve sent a confirmation with your order details.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Package className="w-5 h-5 text-[#FF7A19]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-1">Order processing</h3>
                <p className="text-sm text-[#3A3A3A]">
                  You&apos;ll receive updates by email as we prepare your order.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Link href="/account/orders" className="flex-1">
            <Button variant="outline" className="w-full">
              View My Orders
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="primary" className="w-full">
              Continue Shopping
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
