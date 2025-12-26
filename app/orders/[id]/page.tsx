'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/loaders/Spinner';
import { ChevronLeft, Package, MapPin, CreditCard, FileText } from 'lucide-react';
import { Order } from '@/types/order';
import { orderService } from '@/services/order.service';
import { useAppSelector, useAppDispatch } from '@/store';
import { clearCart } from '@/store/cartSlice';
import { formatCurrency, formatDate, getOrderStatusColor } from '@/lib/helpers';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    // Check for payment success callback
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment');
    const paymentReference = urlParams.get('reference');
    
    if (paymentSuccess === 'success' && paymentReference) {
      // Clear cart if payment was successful
      const shouldClearCart = sessionStorage.getItem('clear_cart_after_payment');
      if (shouldClearCart === 'true') {
        dispatch(clearCart());
        sessionStorage.removeItem('clear_cart_after_payment');
      }
      
      // Clear checkout session data
      sessionStorage.removeItem('pending_checkout_data');
      sessionStorage.removeItem('pending_payment_reference');
      
      toast.success('Payment successful! Order created.');
    }
    
    // Fetch order regardless of user authentication status
    // The backend API can handle both authenticated and guest orders
    fetchOrder();
  }, [orderId, dispatch]);

  const fetchOrder = async () => {
    try {
      setIsLoading(true);
      const data = await orderService.getOrderById(orderId);
      
      // Transform order data to match Order interface
      const formattedOrder: Order = {
        ...data,
        items: data.items || data.order_items || [],
        delivery_address: data.shipping_address || data.delivery_address,
        delivery_option: data.delivery_option || 
          data.shipping_address?.delivery_option || 
          data.delivery_address?.delivery_option || 
          {
            id: 'standard',
            name: 'Standard Delivery',
            description: 'Standard delivery option',
            price: data.shipping_fee || data.delivery_fee || 0,
          },
        delivery_fee: data.shipping_fee || data.delivery_fee || 0,
      };
      
      setOrder(formattedOrder);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    // Confirm cancellation
    const confirmed = window.confirm(
      'Are you sure you want to cancel this order? This action cannot be undone.'
    );
    
    if (!confirmed) return;

    setIsCancelling(true);

    try {
      // For anonymous users, get email from order delivery address
      // Note: delivery_address may contain email for guest orders (stored as JSONB in backend)
      const email = user?.email || (order.delivery_address as any)?.email || null;
      
      if (!email && !user) {
        toast.error('Unable to cancel order: Email verification required. Please contact support.');
        setIsCancelling(false);
        return;
      }

      const cancelledOrder = await orderService.cancelOrder(order.id, email || undefined);
      
      // Update local state
      setOrder({
        ...order,
        status: 'cancelled',
      });

      toast.success('Order cancelled successfully');
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      toast.error(error?.message || 'Failed to cancel order. Please contact support.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order not found</h2>
          <Link href="/orders">
            <Button variant="primary">Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/orders">
            <Button variant="ghost" size="sm" icon={<ChevronLeft size={16} />} className="mb-4">
              Back to Orders
            </Button>
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Order Details</h1>
              <p className="text-gray-600">Order #{order.order_number}</p>
            </div>
            <Badge className={getOrderStatusColor(order.status)} size="lg">
              {order.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package size={20} />
                Order Items
              </h2>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4 py-4 border-b border-gray-100 last:border-b-0">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.product_image ? (
                        <img 
                          src={item.product_image} 
                          alt={item.product_name || 'Product'} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg></div>';
                          }}
                        />
                      ) : (
                        <Package className="text-gray-400" size={32} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">{item.product_name}</p>
                      <p className="text-sm text-gray-600 mb-2">Quantity: {item.quantity}</p>
                      {item.selected_variants && Object.keys(item.selected_variants).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {Object.values(item.selected_variants).map((variant: any, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {variant.name}: {variant.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {/* ✅ Use backend's total_price directly - already in GHS, NO calculation */}
                        {formatCurrency(item.total_price ?? item.subtotal ?? 0)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {/* ✅ Use backend's unit_price directly - already in GHS */}
                        {formatCurrency(item.unit_price ?? 0)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            {order.delivery_address && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin size={20} />
                  Delivery Address
                </h2>
                <div className="text-gray-600">
                  {order.delivery_address?.full_name && (
                    <p className="font-semibold text-gray-900 mb-1">
                      {order.delivery_address.full_name}
                    </p>
                  )}
                  {order.delivery_address?.phone && (
                    <p>{order.delivery_address.phone}</p>
                  )}
                  {order.delivery_address?.street_address && (
                    <p>{order.delivery_address.street_address}</p>
                  )}
                  {order.delivery_address?.city && (
                    <p>
                      {order.delivery_address.city}
                      {order.delivery_address?.region && 
                        `, ${order.delivery_address.region}`}
                    </p>
                  )}
                  {order.delivery_address?.postal_code && (
                    <p>{order.delivery_address.postal_code}</p>
                  )}
                  {order.delivery_address?.country && (
                    <p>{order.delivery_address.country}</p>
                  )}
                </div>
              </div>
            )}

            {/* Payment & Delivery Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard size={18} />
                  Payment Method
                </h3>
                <p className="text-gray-600 capitalize">{order.payment_method.replace('_', ' ')}</p>
                <Badge
                  className={order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                  size="sm"
                >
                  {order.payment_status.toUpperCase()}
                </Badge>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Package size={18} />
                  Delivery Option
                </h3>
                {order.delivery_option ? (
                  <>
                    <p className="text-gray-900 font-medium">
                      {order.delivery_option?.name || 'Standard Delivery'}
                    </p>
                    {order.delivery_option?.description && (
                      <p className="text-sm text-gray-600">
                        {order.delivery_option.description}
                      </p>
                    )}
                    {order.delivery_fee && (
                      <p className="text-sm text-gray-600 mt-1">
                        Fee: {formatCurrency(order.delivery_fee)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-gray-600">Standard Delivery</p>
                )}
              </div>
            </div>

            {/* Order Notes */}
            {order.notes && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText size={18} />
                  Order Notes
                </h3>
                <p className="text-gray-600">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Order Date</span>
                  <span>{formatDate(order.created_at)}</span>
                </div>
                {order.tracking_number && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tracking #</span>
                    <span className="font-mono text-sm">{order.tracking_number}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(order.delivery_fee)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                {order.tax > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {order.status === 'pending' && (
                  <Button 
                    variant="danger" 
                    size="md" 
                    className="w-full"
                    onClick={handleCancelOrder}
                    isLoading={isCancelling}
                    disabled={isCancelling}
                  >
                    Cancel Order
                  </Button>
                )}
                <Button variant="outline" size="md" className="w-full">
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



