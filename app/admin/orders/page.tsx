'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Package, 
  Search, 
  Eye, 
  ChevronLeft,
  Filter,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAppSelector } from '@/store';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { CSVExporter, OrderColumns } from '@/lib/csvExport';

interface Order {
  id: string;
  order_number: string;
  user_name: string;
  user_email: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  created_at: string;
  items_count: number;
  notes?: string | null;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      router.push('/');
      return;
    }
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchOrders();
    }, searchQuery ? 300 : 0);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user, statusFilter, searchQuery]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('orders')
        .select(`
          *,
          user:users!orders_user_id_fkey(id, first_name, last_name, email),
          order_items(*)
        `);

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      let formattedOrders = data?.map(order => ({
        id: order.id,
        order_number: order.order_number,
        user_name: `${order.user?.first_name || ''} ${order.user?.last_name || ''}`.trim() || 'Unknown',
        user_email: order.user?.email || 'No email',
        total_amount: order.total,
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        items_count: order.order_items?.length || 0,
        notes: order.notes || null,
      })) || [];

      // Apply search filter client-side
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        formattedOrders = formattedOrders.filter(order =>
          order.order_number.toLowerCase().includes(searchLower) ||
          order.id.toLowerCase().includes(searchLower) ||
          order.user_name.toLowerCase().includes(searchLower) ||
          order.user_email.toLowerCase().includes(searchLower)
        );
      }

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, trackingNumber?: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          tracking_number: trackingNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      // Send email notification via backend API
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
            tracking_number: trackingNumber,
          }),
        });

        if (response.ok) {
          toast.success('Order status updated and email sent!');
        } else {
          toast.success('Order status updated (email failed)');
        }
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        toast.success('Order status updated (email failed)');
      }

      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const downloadOrderPDF = async (orderId: string, orderNumber: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders/${orderId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      pending: { variant: 'warning' as const, icon: Clock, label: 'Pending' },
      processing: { variant: 'info' as const, icon: Package, label: 'Processing' },
      shipped: { variant: 'info' as const, icon: Truck, label: 'Shipped' },
      delivered: { variant: 'success' as const, icon: CheckCircle, label: 'Delivered' },
      cancelled: { variant: 'error' as const, icon: XCircle, label: 'Cancelled' },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon size={12} />
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: Order['payment_status']) => {
    const statusConfig = {
      pending: 'warning' as const,
      paid: 'success' as const,
      failed: 'error' as const,
    };

    return <Badge variant={statusConfig[status]}>{status.toUpperCase()}</Badge>;
  };

  const handleExportOrders = () => {
    const exportData = orders.map(order => ({
      order_number: order.order_number,
      customer_name: order.user_name,
      customer_email: order.user_email,
      total_amount: typeof order.total_amount === 'string' ? parseFloat(order.total_amount) || 0 : (order.total_amount || 0),
      status: order.status,
      payment_status: order.payment_status,
      created_at: order.created_at,
    }));
    
    CSVExporter.export(exportData, OrderColumns, 'orders');
    toast.success('Orders exported successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ChevronLeft size={20} />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-[#1A1A1A]">Orders</h1>
                <p className="text-sm text-[#3A3A3A] mt-1">Manage and track customer orders</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              icon={<Download size={18} />}
              onClick={handleExportOrders}
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#3A3A3A]" size={20} />
                <input
                  type="text"
                  placeholder="Search by order number, order ID, customer name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>Today</option>
                <option>This month</option>
                <option>All time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19]"></div>
            </div>
          ) : orders.length === 0 ? (
            /* Empty State */
            <div className="text-center py-20">
              <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-[#FF7A19]" />
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">No Orders Yet</h3>
              <p className="text-[#3A3A3A] mb-6">
                Orders will appear here once customers start purchasing
              </p>
            </div>
          ) : (
            /* Orders Table */
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Order #</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Customer</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Date</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Items</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Total</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Status</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Payment</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-[#FF7A19] font-semibold">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-sm text-[#1A1A1A]">{order.user_name}</p>
                          <p className="text-xs text-[#3A3A3A]">{order.user_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#3A3A3A]">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#3A3A3A]">
                        {order.items_count} items
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-[#1A1A1A]">
                          GHS {order.total_amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4">
                        {getPaymentStatusBadge(order.payment_status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye size={16} />
                              View
                            </Button>
                          </Link>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadOrderPDF(order.id, order.order_number)}
                            title="Download PDF"
                          >
                            <FileText size={16} />
                          </Button>
                          
                          {/* Status Update Dropdown */}
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#FF7A19]"
                            disabled={order.status === 'delivered' || order.status === 'cancelled'}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


