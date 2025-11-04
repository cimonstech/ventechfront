'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Package, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { orderService } from '@/services/order.service';
import toast from 'react-hot-toast';

export default function OrderSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const reference = searchParams.get('reference');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId && !order && !loading) {
      fetchOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]); // Only depend on orderId

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const orderData = await orderService.getOrderById(orderId!);
      setOrder(orderData);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-[#3A3A3A]">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6 text-center">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-3">Order Placed Successfully!</h1>
          <p className="text-[#3A3A3A] mb-6">
            Thank you for your order. We've received your payment and will process your order shortly.
          </p>
          {order && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-[#3A3A3A] mb-2">Order Number</p>
              <p className="text-xl font-bold text-[#FF7A19]">{order.order_number}</p>
            </div>
          )}
        </div>

        {/* Order Details */}
        {order && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Order Summary</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-[#3A3A3A]">Subtotal</span>
                <span className="font-semibold text-[#1A1A1A]">GHS {order.subtotal?.toFixed(2) || '0.00'}</span>
              </div>
              {order.shipping_fee > 0 && (
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-[#3A3A3A]">Shipping</span>
                  <span className="font-semibold text-[#1A1A1A]">GHS {order.shipping_fee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-3 border-t-2 border-gray-300">
                <span className="text-lg font-bold text-[#1A1A1A]">Total</span>
                <span className="text-lg font-bold text-[#FF7A19]">GHS {order.total?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">What's Next?</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-1">Check Your Email</h3>
                <p className="text-sm text-[#3A3A3A]">
                  We've sent a confirmation email with your order details and receipt.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <Package className="w-5 h-5 text-[#FF7A19]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-1">Order Processing</h3>
                <p className="text-sm text-[#3A3A3A]">
                  Your order is being processed and will be shipped soon. You'll receive updates via email.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link href="/orders" className="flex-1">
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

