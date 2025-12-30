'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import CheckmarkLoader from '@/components/loaders/CheckmarkLoader';
import { Package, Search, MapPin, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { orderService } from '@/services/order.service';
import { Order } from '@/types/order';
import { formatCurrency, formatDate, getOrderStatusColor } from '@/lib/helpers';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

export default function TrackOrderPage() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderNumber.trim()) {
      toast.error('Please enter an order number');
      return;
    }

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setOrder(null);

    try {
      const orderData = await orderService.getOrderByNumberAndEmail(
        orderNumber.trim().toUpperCase(),
        email.trim().toLowerCase()
      );
      
      if (orderData) {
        setOrder(orderData);
        toast.success('Order found!');
      } else {
        setError('Order not found. Please check your order number and email address and try again.');
        toast.error('Order not found');
      }
    } catch (err: any) {
      console.error('Error tracking order:', err);
      setError(err.message || 'Failed to track order. Please try again.');
      toast.error('Failed to track order');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'shipped':
        return <Package className="text-blue-500" size={20} />;
      case 'processing':
        return <Clock className="text-yellow-500" size={20} />;
      case 'cancelled':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return <AlertCircle className="text-gray-500" size={20} />;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Your order is being prepared.';
      case 'processing':
        return 'Your order is being processed.';
      case 'shipped':
        return 'Your order has been shipped and is on its way.';
      case 'delivered':
        return 'Your order has been delivered.';
      case 'cancelled':
        return 'Your order has been cancelled.';
      default:
        return 'Order status unknown.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Package className="text-[#FF7A19]" size={40} />
            <h1 className="text-3xl font-bold text-gray-900">Track Your Order</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Enter your order number (or order ID) and email address to track the status of your order. You can find your order number in your order confirmation email.
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleTrackOrder} className="bg-white rounded-xl shadow-sm p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Order Number or Order ID
                </label>
                <input
                  type="text"
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., ORD-001-2810 or order ID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-lg font-mono"
                  disabled={isLoading}
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter the email used for this order"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-lg"
                  disabled={isLoading}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the email address you used when placing this order
                </p>
              </div>
              <div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  icon={<Search size={20} />}
                  disabled={isLoading || !orderNumber.trim() || !email.trim()}
                  className="w-full"
                >
                  {isLoading ? 'Tracking...' : 'Track Order'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <CheckmarkLoader size={72} color="#FF7A19" speedMs={600} />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <XCircle className="mx-auto mb-4 text-red-500" size={48} />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Order Not Found</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Order Details */}
        {order && !isLoading && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Order Header */}
              <div className={`p-6 ${
                order.status === 'cancelled' 
                  ? 'bg-gradient-to-r from-red-600 to-red-700' 
                  : 'bg-gradient-to-r from-[#FF7A19] to-[#FF9A19]'
              } text-white`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-sm opacity-90 mb-1">Order Number</p>
                    <p className="text-2xl font-bold font-mono">{order.order_number}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusIcon(order.status)}
                    <Badge 
                      variant={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'error' : 'default'}
                      size="lg"
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Order Status Message */}
              <div className={`p-6 border-b ${
                order.status === 'cancelled' 
                  ? 'bg-red-50 border-red-200' 
                  : 'border-gray-200'
              }`}>
                <div className="flex items-start gap-3">
                  {getStatusIcon(order.status)}
                  <div>
                    <p className={`font-semibold mb-1 ${
                      order.status === 'cancelled' 
                        ? 'text-red-900' 
                        : 'text-gray-900'
                    }`}>
                      Current Status
                    </p>
                    <p className={order.status === 'cancelled' ? 'text-red-700' : 'text-gray-600'}>
                      {getStatusMessage(order.status)}
                    </p>
                    {order.status === 'cancelled' && (
                      <p className="text-sm text-red-600 mt-2">
                        If you have already made payment, please contact us for a refund.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order Date */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={18} className="text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Order Date</h3>
                  </div>
                  <p className="text-gray-600">{formatDate(order.created_at)}</p>
                </div>

                {/* Total Amount */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Package size={18} className="text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Total Amount</h3>
                  </div>
                  <p className="text-2xl font-bold text-[#FF7A19]">{formatCurrency(order.total)}</p>
                </div>

                {/* Payment Status */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={18} className="text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Payment Status</h3>
                  </div>
                  <Badge 
                    variant={order.payment_status === 'paid' ? 'success' : 'default'}
                    size="sm"
                  >
                    {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  </Badge>
                </div>

                {/* Tracking Number */}
                {order.tracking_number && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={18} className="text-gray-400" />
                      <h3 className="font-semibold text-gray-900">Tracking Number</h3>
                    </div>
                    <p className="text-gray-600 font-mono">{order.tracking_number}</p>
                  </div>
                )}
              </div>

              {/* Delivery Address */}
              {order.delivery_address && (
                <div className="p-6 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={18} className="text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Delivery Address</h3>
                  </div>
                  <div className="text-gray-600">
                    {order.delivery_address.full_name && (
                      <p className="font-medium mb-1">{order.delivery_address.full_name}</p>
                    )}
                    <p>{order.delivery_address.street_address}</p>
                    <p>
                      {order.delivery_address.city}, {order.delivery_address.region}
                    </p>
                    {order.delivery_address.phone && (
                      <p className="mt-2">Phone: {order.delivery_address.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div className="p-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Order Items</h3>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity} × {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(item.total_price ?? item.subtotal ?? (item.unit_price * item.quantity))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pre-Order Notice */}
              {(order as any).is_pre_order && (
                <div className="p-6 border-t border-gray-200 bg-blue-50">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Pre-Order</h3>
                      <p className="text-sm text-blue-700">
                        This is a pre-order. Your items will be shipped according to the estimated arrival date.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="flex-1"
                  >
                    View Full Order Details
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setOrder(null);
                      setOrderNumber('');
                      setEmail('');
                      setError(null);
                    }}
                    className="flex-1"
                  >
                    Track Another Order
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

