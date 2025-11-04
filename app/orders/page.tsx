'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, ChevronRight, Eye, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAppSelector } from '@/store';
import { orderService } from '@/services/order.service';
import { formatCurrency } from '@/lib/helpers';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  total: number;
  created_at: string;
  items?: any[];
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    fetchOrders();
  }, [isAuthenticated, user, router]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      
      if (!user?.id) {
        toast.error('User not found');
        return;
      }

      const ordersData = await orderService.getUserOrders(user.id);
      
      // Transform orders to match Order interface
      const formattedOrders = (ordersData || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        total: order.total,
        created_at: order.created_at,
        items: order.items || order.order_items || [],
      }));

      setOrders(formattedOrders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const config = {
      pending: { variant: 'warning' as const, label: 'Pending' },
      processing: { variant: 'info' as const, label: 'Processing' },
      shipped: { variant: 'info' as const, label: 'Shipped' },
      delivered: { variant: 'success' as const, label: 'Delivered' },
      cancelled: { variant: 'error' as const, label: 'Cancelled' },
    };
    const { variant, label } = config[status] || config.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getPaymentStatusBadge = (status: Order['payment_status']) => {
    const config = {
      pending: { variant: 'warning' as const, label: 'PENDING' },
      paid: { variant: 'success' as const, label: 'PAID' },
      failed: { variant: 'error' as const, label: 'FAILED' },
    };
    const { variant, label } = config[status] || config.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7A19]"></div>
            <span className="ml-3 text-[#3A3A3A]">Loading orders...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#3A3A3A] mb-6">
          <Link href="/" className="hover:text-[#FF7A19]">Home</Link>
          <ChevronRight size={16} />
          <span className="text-[#FF7A19]">My Orders</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">My Orders</h1>
          <p className="text-[#3A3A3A]">View and track your order history</p>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-[#FF7A19]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">No Orders Yet</h2>
            <p className="text-[#3A3A3A] mb-6 max-w-md mx-auto">
              You haven't placed any orders yet. Start shopping to see your orders here!
            </p>
            <Link
              href="/shop"
              className="inline-block bg-[#FF7A19] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#FF8C3A] transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">
                      Order #{order.order_number}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-[#3A3A3A]">
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CreditCard size={16} />
                        <span>{formatCurrency(order.total)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                    {getPaymentStatusBadge(order.payment_status)}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-[#3A3A3A]">
                      <span className="font-medium">{(order.items || []).length} item(s)</span>
                    </div>
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye size={16} className="mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
