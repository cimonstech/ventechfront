'use client';

import { authHeaders } from '@/lib/authHeaders';
import { useState, useEffect } from 'react';
import { apiRequest, toApiError } from '@/lib/api';
import { LoadGate, TableSkeleton } from '@/components/ui-states';
import { noteQueryFail } from '@/lib/queryState';
import { useRouter } from 'next/navigation';
import { 
  Package, 
  Download,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  AdminPageHeader,
  AdminRowCard,
  FilterBar,
  filterSelectClassName,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { useAppSelector } from '@/store';
import { ADMIN_DATA_DENIED } from '@/lib/access';
import { hasAdminEntry } from '@/lib/roles';
import { useAccess } from '@/context/AccessContext';
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
  const { canEdit } = useAccess();
  const canEditOrders = canEdit('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    const open = new URLSearchParams(window.location.search).get('open');
    if (!open) return;
    setSelectedOrderId(open);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated && !hasAdminEntry(user?.role)) {
      router.push('/');
      return;
    }
    
    // Clear pending orders notification when orders page is opened
    const clearPendingOrdersNotification = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        await fetch(`${API_URL}/api/orders/notifications/read`, {
          method: 'POST',
          headers: await authHeaders(),
        });
      } catch {
        // Ignore errors — badge count is not blocking
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
      setDenied(false);
      
      try {
        const result = await apiRequest<any[]>('/api/orders');
        if (!result.ok) throw toApiError(result);
        if (result.data) {
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
            setLoaded(true);
            setFailed(false);
            return;
        }
      } catch (apiError) {
        const kind = noteQueryFail(apiError);
        if (kind === 'forbidden') throw apiError;
        if (kind === 'unauthorized') return;
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
      setLoaded(true);
      setFailed(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      const kind = noteQueryFail(error);
      if (kind === 'forbidden' || (error instanceof Error && error.message === ADMIN_DATA_DENIED)) {
        setDenied(true);
      } else if (kind !== 'unauthorized') {
        setFailed(true);
      }
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
          ...(await authHeaders()),
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
          ...(await authHeaders()),
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
          ...(await authHeaders()),
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
    <div className="min-w-0">
      <AdminPageHeader
        title="Orders"
        subtitle={`${orders.length} order${orders.length === 1 ? '' : 's'}`}
        secondary={[
          ...(canEditOrders
            ? [{
                label: isSelectMode ? 'Cancel select' : 'Select',
                onClick: () => {
                  setIsSelectMode(!isSelectMode);
                  if (isSelectMode) setSelectedOrders(new Set());
                },
              }]
            : []),
          { label: 'Export all', icon: <Download size={16} />, onClick: handleExportOrders },
        ]}
        extra={
          canEditOrders && isSelectMode && selectedOrders.size > 0 ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <select
                onChange={(e) => bulkUpdateStatus(e.target.value)}
                className={`${filterSelectClassName()} min-h-11`}
                defaultValue=""
              >
                <option value="" disabled>Bulk update status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                onChange={(e) => bulkUpdatePaymentStatus(e.target.value)}
                className={`${filterSelectClassName()} min-h-11`}
                defaultValue=""
              >
                <option value="" disabled>Bulk update payment</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
              <span className="text-sm text-[#3A3A3A]">{selectedOrders.size} selected</span>
            </div>
          ) : null
        }
      />

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search orders"
        activeCount={statusFilter !== 'all' ? 1 : 0}
        onClear={() => setStatusFilter('all')}
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={filterSelectClassName()}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </FilterBar>

        <div className="overflow-hidden rounded-xl">
          <LoadGate
            loaded={loaded}
            loading={isLoading}
            updating={isLoading && loaded}
            error={failed}
            forbidden={denied}
            isEmpty={orders.length === 0}
            filtered={Boolean(searchQuery || statusFilter !== 'all')}
            onRetry={() => void fetchOrders()}
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            skeleton={<TableSkeleton rows={8} />}
            emptyTitle="No orders yet"
            emptyDescription="Orders will appear here once customers start purchasing."
            denyHome="/admin"
          >
            <ResponsiveTable
              headers={
                <tr>
                  {isSelectMode ? (
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedOrders.size === orders.length && orders.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                        aria-label="Select all orders"
                      />
                    </th>
                  ) : null}
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              }
              cards={orders.map((order) => (
                <AdminRowCard
                  key={order.id}
                  name={order.order_number}
                  status={getStatusBadge(order.status)}
                  facts={[
                    { label: 'Customer', value: order.user_name },
                    { label: 'Total', value: `GHS ${order.total_amount.toLocaleString()}` },
                    { label: 'Items', value: order.items_count },
                    { label: 'Date', value: new Date(order.created_at).toLocaleDateString() },
                  ]}
                  actions={
                    <RowActions
                      name={order.order_number}
                      actions={[
                        {
                          label: 'View',
                          onClick: () => {
                            setSelectedOrderId(order.id);
                            setIsModalOpen(true);
                          },
                        },
                        { label: 'Download PDF', onClick: () => downloadOrderPDF(order.id, order.order_number) },
                      ]}
                    />
                  }
                />
              ))}
            >
              {orders.map((order) => (
                <tr key={order.id} className={`hover:bg-gray-50 ${selectedOrders.has(order.id) ? 'bg-blue-50' : ''}`}>
                  {isSelectMode ? (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                        aria-label={`Select ${order.order_number}`}
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <p className="font-mono text-sm font-semibold text-[#FF7A19]">{order.order_number}</p>
                    {order.is_pre_order ? (
                      <span className="mt-1 inline-block rounded bg-black px-2 py-0.5 text-xs font-semibold text-white">Pre-order</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[#1A1A1A]">{order.user_name}</p>
                    <p className="text-xs text-[#3A3A3A]">{order.user_email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#3A3A3A]">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-[#3A3A3A]">{order.items_count}</td>
                  <td className="px-4 py-3 font-semibold text-[#1A1A1A]">GHS {order.total_amount.toLocaleString()}</td>
                  <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                  <td className="px-4 py-3">
                    {canEditOrders ? (
                      <select
                        value={order.payment_status}
                        onChange={(e) => updatePaymentStatus(order.id, e.target.value)}
                        className="min-h-11 rounded-lg border border-gray-300 bg-white px-2 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    ) : (
                      <span className="text-sm capitalize text-[#3A3A3A]">{order.payment_status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowActions
                      name={order.order_number}
                      actions={[
                        {
                          label: 'View',
                          onClick: () => {
                            setSelectedOrderId(order.id);
                            setIsModalOpen(true);
                          },
                        },
                        { label: 'Download PDF', onClick: () => downloadOrderPDF(order.id, order.order_number) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </ResponsiveTable>
          </LoadGate>
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


