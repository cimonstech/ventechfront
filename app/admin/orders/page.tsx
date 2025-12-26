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
import { OrderDetailModal } from '@/components/admin/OrderDetailModal';

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
  is_pre_order?: boolean;
  shipping_address?: any;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      router.push('/');
      return;
    }
    
    // Clear pending orders notification when orders page is opened
    const clearPendingOrdersNotification = async () => {
      try {
        // Mark pending orders notifications as read (if notifications table exists)
        try {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('type', 'order')
            .eq('is_read', false);
        } catch (notifError) {
          // Notifications table might not exist - ignore
        }
      } catch (error) {
        // Ignore errors
      }
    };
    
    clearPendingOrdersNotification();
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchOrders();
    }, searchQuery ? 300 : 0);
    
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user, statusFilter, searchQuery]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      
      // Try backend API first (better access to all fields including is_pre_order)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      try {
        const response = await fetch(`${API_URL}/api/orders`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            let formattedOrders = result.data.map((order: any) => {
              // Backend already extracts is_pre_order, but we'll use it directly
              const isPreOrder = order.is_pre_order || false;
              
              return {
                id: order.id,
                order_number: order.order_number,
                user_name: order.user 
                  ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim() || 'Unknown'
                  : (order.shipping_address?.full_name || 'Guest Customer'),
                user_email: order.user?.email || order.shipping_address?.email || 'No email',
                total_amount: order.total,
                status: order.status,
                payment_status: order.payment_status,
                created_at: order.created_at,
                items_count: order.order_items?.length || 0,
                notes: order.notes || null,
                is_pre_order: isPreOrder,
                shipping_address: order.shipping_address,
              };
            });

            // Apply search filter client-side
            if (searchQuery) {
              const searchLower = searchQuery.toLowerCase();
              formattedOrders = formattedOrders.filter((order: Order) =>
                order.order_number.toLowerCase().includes(searchLower) ||
                order.id.toLowerCase().includes(searchLower) ||
                order.user_name.toLowerCase().includes(searchLower) ||
                order.user_email.toLowerCase().includes(searchLower)
              );
            }

            setOrders(formattedOrders);
            return;
          }
        }
      } catch (apiError) {
        console.warn('Backend API failed, trying Supabase:', apiError);
      }

      // Fallback: Use Supabase directly
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

      let formattedOrders = data?.map(order => {
        // Extract is_pre_order from shipping_address if it exists there
        const isPreOrder = order.is_pre_order || order.shipping_address?.is_pre_order || false;
        
        // Debug logging
        if (isPreOrder) {
          console.log('Pre-order detected:', {
            order_number: order.order_number,
            is_pre_order: order.is_pre_order,
            shipping_address_is_pre_order: order.shipping_address?.is_pre_order,
          });
        }
        
        return {
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
          is_pre_order: isPreOrder,
          shipping_address: order.shipping_address,
        };
      }) || [];

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
      // Update order status via backend API (handles emails automatically)
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
        const result = await response.json();
        if (result.success) {
          toast.success('Order status updated and email sent!');
          fetchOrders(); // Refresh orders
        } else {
          throw new Error(result.message || 'Failed to update order status');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update order status');
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error(error.message || 'Failed to update order status');
    }
  };

  const updatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    try {
      // Update payment status via backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders/${orderId}/payment-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_status: newPaymentStatus,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success('Payment status updated!');
          fetchOrders(); // Refresh orders
        } else {
          throw new Error(result.message || 'Failed to update payment status');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update payment status');
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast.error(error.message || 'Failed to update payment status');
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length && orders.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order');
      return;
    }

    try {
      const updatePromises = Array.from(selectedOrders).map(orderId =>
        updateOrderStatus(orderId, newStatus)
      );
      
      await Promise.all(updatePromises);
      const count = selectedOrders.size;
      setSelectedOrders(new Set());
      setIsSelectMode(false);
      toast.success(`Updated ${count} order(s)!`);
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error bulk updating orders:', error);
      toast.error('Failed to update some orders');
    }
  };

  const bulkUpdatePaymentStatus = async (newPaymentStatus: string) => {
    if (selectedOrders.size === 0) {
      toast.error('Please select at least one order');
      return;
    }

    try {
      const updatePromises = Array.from(selectedOrders).map(orderId =>
        updatePaymentStatus(orderId, newPaymentStatus)
      );
      
      await Promise.all(updatePromises);
      const count = selectedOrders.size;
      setSelectedOrders(new Set());
      setIsSelectMode(false);
      toast.success(`Updated payment status for ${count} order(s)!`);
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Error bulk updating payment status:', error);
      toast.error('Failed to update some orders');
    }
  };

  const downloadOrderPDF = async (orderId: string, orderNumber: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const pdfUrl = `${API_URL}/api/orders/${orderId}/pdf`;
      
      console.log('Downloading PDF from:', pdfUrl);
      console.log('API URL configured:', API_URL);
      
      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf',
        },
      }).catch((fetchError) => {
        // Network error (connection refused, CORS, etc.)
        console.error('Network error fetching PDF:', fetchError);
        throw new Error(
          `Cannot connect to backend API. Please ensure:\n` +
          `1. Backend server is running\n` +
          `2. API URL is correct: ${API_URL}\n` +
          `3. CORS is configured on the backend`
        );
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to generate PDF';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(`Server error (${response.status}): ${errorMessage}`);
      }

      const blob = await response.blob();
      
      if (!blob || blob.size === 0) {
        throw new Error('PDF file is empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      const errorMessage = error?.message || 'Failed to download PDF. Please check your connection and try again.';
      toast.error(errorMessage);
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
            <div className="flex items-center gap-2">
              {isSelectMode && selectedOrders.size > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    onChange={(e) => bulkUpdateStatus(e.target.value)}
                    className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    defaultValue=""
                  >
                    <option value="" disabled>Bulk Update Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    onChange={(e) => bulkUpdatePaymentStatus(e.target.value)}
                    className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    defaultValue=""
                  >
                    <option value="" disabled>Bulk Update Payment</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <span className="text-sm text-[#3A3A3A]">
                    {selectedOrders.size} selected
                  </span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  if (isSelectMode) setSelectedOrders(new Set());
                }}
              >
                {isSelectMode ? 'Cancel' : 'Select'}
              </Button>
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
                    {isSelectMode && (
                      <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A1A1A]">
                        <input
                          type="checkbox"
                          checked={selectedOrders.size === orders.length && orders.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                        />
                      </th>
                    )}
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
                    <tr key={order.id} className={`hover:bg-gray-50 ${selectedOrders.has(order.id) ? 'bg-blue-50' : ''}`}>
                      {isSelectMode && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => toggleOrderSelection(order.id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-sm text-[#FF7A19] font-semibold">
                            {order.order_number}
                          </span>
                          {order.is_pre_order && (
                            <span className="px-2 py-0.5 bg-black text-white text-xs font-semibold rounded w-fit">
                              PRE-ORDER
                            </span>
                          )}
                        </div>
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
                        {/* Payment status dropdown - always editable */}
                        <select
                          value={order.payment_status}
                          onChange={(e) => updatePaymentStatus(order.id, e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#FF7A19] bg-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setIsModalOpen(true);
                            }}
                          >
                            <Eye size={16} />
                            View
                          </Button>
                          
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

      {/* Order Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrderId(null);
          }}
          orderId={selectedOrderId}
          onStatusUpdate={() => {
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}


