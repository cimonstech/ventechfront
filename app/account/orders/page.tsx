'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Eye, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AccessDenied, AccountListSkeleton, EmptyState, ErrorState, UpdatingNotice } from '@/components/ui-states';
import { useOnlineRefetch } from '@/hooks/useOnlineRefetch';
import { noteQueryFail } from '@/lib/queryState';
import { useAppSelector } from '@/store';
import { orderService } from '@/services/order.service';
import { formatCurrency } from '@/lib/helpers';

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
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      setFailed(false);
      setForbidden(false);
      const ordersData = await orderService.getUserOrders(user.id);
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
      const kind = noteQueryFail(error);
      if (kind === 'forbidden') setForbidden(true);
      else if (kind !== 'unauthorized') setFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    void fetchOrders();
  }, [isAuthenticated, user, router, fetchOrders]);

  useOnlineRefetch(fetchOrders);

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

  if (isLoading && orders.length === 0) {
    return (
      <div>
        <div className="max-w-5xl">
          <AccountListSkeleton rows={4} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-5xl">
        <div className="mb-6 hidden md:block">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">My Orders</h1>
          <p className="text-[#3A3A3A]">View and track your order history</p>
        </div>

        {forbidden ? (
          <AccessDenied
            title="You don't have access"
            description="You don't have access to this data."
            primary={{ label: 'Go to your account', href: '/account' }}
          />
        ) : failed && orders.length === 0 ? (
          <ErrorState
            title="We couldn't load your orders"
            description="Try again in a moment. If it keeps failing, contact support."
            primary={{ label: 'Try again', onClick: () => void fetchOrders() }}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="When you place an order, you'll track it here — from packing through delivery."
            primary={{ label: 'Start shopping', href: '/shop' }}
          />
        ) : (
          <div className="space-y-4">
            {isLoading ? <UpdatingNotice /> : null}
            {failed ? (
              <div className="flex flex-col items-stretch gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <p className="text-sm text-red-800">We couldn&apos;t refresh this. Your last loaded data is still here.</p>
                <button type="button" className="min-h-11 text-sm font-semibold text-red-800 underline" onClick={() => void fetchOrders()}>
                  Try again
                </button>
              </div>
            ) : null}
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow">
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
                    <Link href={`/account/orders/${order.id}`} className="w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="w-full sm:w-auto min-h-11">
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
