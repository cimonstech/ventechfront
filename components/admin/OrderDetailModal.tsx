'use client';

import { useState, useEffect } from 'react';
import { X, Download, Mail, Package, User, MapPin, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  subtotal?: number; // Legacy field, prefer total_price
  total_price?: number; // ✅ Backend stores this - use this directly, already in GHS
  selected_variants?: any;
  is_pre_order?: boolean;
}

interface Order {
  id: string;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: string;
  subtotal: number;
  discount: number;
  tax: number;
  shipping_fee: number;
  total: number;
  shipping_address: any;
  billing_address?: any;
  customer_bio?: {
    name: string;
    email: string;
    phone: string;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  customer_name?: string;
  customer_email?: string;
  items?: OrderItem[];
  is_pre_order?: boolean;
  pre_order_shipping_option?: string;
  estimated_arrival_date?: string;
}

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onStatusUpdate?: () => void;
}

export function OrderDetailModal({ isOpen, onClose, orderId, onStatusUpdate }: OrderDetailModalProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder();
    }
  }, [isOpen, orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      
      // Try fetching via backend API first (bypasses RLS)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      try {
        const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const orderData = result.data;
            const orderItems = orderData.order_items || orderData.items || [];
            
            // Extract is_pre_order from shipping_address if it exists there
            const isPreOrder = orderData.is_pre_order || orderData.shipping_address?.is_pre_order || false;
            const preOrderShippingOption = orderData.pre_order_shipping_option || orderData.shipping_address?.pre_order_shipping_option || null;
            const estimatedArrivalDate = orderData.estimated_arrival_date || orderData.shipping_address?.estimated_arrival_date || null;

            const formattedOrder: Order = {
              ...orderData,
              items: orderItems,
              customer_name: orderData.user 
                ? `${orderData.user.first_name || ''} ${orderData.user.last_name || ''}`.trim() || 'Customer'
                : (orderData.customer_bio?.name || orderData.shipping_address?.full_name || 'Guest Customer'),
              customer_email: orderData.user?.email || orderData.customer_bio?.email || orderData.shipping_address?.email || 'No email',
              customer_bio: orderData.customer_bio || (orderData.user ? {
                name: `${orderData.user.first_name || ''} ${orderData.user.last_name || ''}`.trim() || 'Customer',
                email: orderData.user.email || '',
                phone: (orderData.user as any).phone || '',
              } : null),
              is_pre_order: isPreOrder,
              pre_order_shipping_option: preOrderShippingOption,
              estimated_arrival_date: estimatedArrivalDate,
            };
            
            console.log('Fetched order via API:', {
              orderId,
              itemsCount: orderItems.length,
              items: orderItems,
            });

            setOrder(formattedOrder);
            return;
          }
        }
      } catch (apiError) {
        console.warn('Backend API failed, trying Supabase:', apiError);
      }

      // Fallback: Fetch via Supabase (may have RLS restrictions)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          user:users!orders_user_id_fkey(id, first_name, last_name, email)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order not found');

      // Fetch order items separately (to avoid RLS/join issues)
      let items: any[] = [];
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      
      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        // If RLS error, try backend API for items
        if (itemsError.message?.includes('policy') || itemsError.message?.includes('permission')) {
          console.warn('RLS policy blocking order_items, trying backend API...');
          try {
            const itemsResponse = await fetch(`${API_URL}/api/orders/${orderId}/items`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            if (itemsResponse.ok) {
              const itemsResult = await itemsResponse.json();
              if (itemsResult.success && itemsResult.data) {
                items = itemsResult.data;
                console.log('Fetched order items via API:', items.length, 'items');
              }
            }
          } catch (apiItemsError) {
            console.error('Failed to fetch items via API:', apiItemsError);
          }
        }
      } else if (itemsData) {
        items = itemsData;
        console.log('Fetched order items:', items.length, 'items');
      }
      
      // Debug: Log what we got
      console.log('Order data:', {
        orderId,
        itemsCount: items.length,
        items: items,
      });
      
      // Get items from order_data or from separately fetched items
      const orderItems = items.length > 0 
        ? items 
        : (orderData.order_items || orderData.items || []);
      
      // Extract is_pre_order from shipping_address if it exists there
      const isPreOrder = orderData.is_pre_order || orderData.shipping_address?.is_pre_order || false;
      const preOrderShippingOption = orderData.pre_order_shipping_option || orderData.shipping_address?.pre_order_shipping_option || null;
      const estimatedArrivalDate = orderData.estimated_arrival_date || orderData.shipping_address?.estimated_arrival_date || null;

      const formattedOrder: Order = {
        ...orderData,
        items: orderItems,
        customer_name: orderData.user 
          ? `${orderData.user.first_name || ''} ${orderData.user.last_name || ''}`.trim() || 'Customer'
          : (orderData.customer_bio?.name || orderData.shipping_address?.full_name || 'Guest Customer'),
        customer_email: orderData.user?.email || orderData.customer_bio?.email || orderData.shipping_address?.email || 'No email',
        customer_bio: orderData.customer_bio || (orderData.user ? {
          name: `${orderData.user.first_name || ''} ${orderData.user.last_name || ''}`.trim() || 'Customer',
          email: orderData.user.email || '',
          phone: orderData.user.phone || '',
        } : null),
        is_pre_order: isPreOrder,
        pre_order_shipping_option: preOrderShippingOption,
        estimated_arrival_date: estimatedArrivalDate,
      };
      
      // Debug: Log what we got
      console.log('Formatted order:', {
        orderId,
        itemsCount: orderItems.length,
        items: orderItems,
        orderItemsFromData: orderData.order_items?.length || 0,
        itemsFromData: orderData.items?.length || 0,
        is_pre_order: isPreOrder,
        shipping_address: orderData.shipping_address,
      });

      setOrder(formattedOrder);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast.error(error.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order || updatingStatus) return;

    try {
      setUpdatingStatus(true);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update order status');
      }

      const result = await response.json();
      
      // Refresh order data
      await fetchOrder();
      
      // Notify parent to refresh orders list
      if (onStatusUpdate) {
        onStatusUpdate();
      }

      toast.success(`Order status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast.error(error.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!order) return;

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
      a.download = `order-${order.order_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      const errorMessage = error?.message || 'Failed to download PDF. Please check your connection and try again.';
      toast.error(errorMessage);
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
      refunded: { variant: 'info' as const, label: 'REFUNDED' },
    };
    const { variant, label } = config[status] || config.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-[#1A1A1A]">Order Details</h2>
              {order?.is_pre_order && (
                <span className="px-3 py-1 bg-black text-white text-xs font-semibold rounded-full">
                  PRE-ORDER
                </span>
              )}
            </div>
            {order && (
              <p className="text-sm text-[#3A3A3A] mt-1">Order #{order.order_number}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-grow overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF7A19]"></div>
              <span className="ml-3 text-[#3A3A3A]">Loading order details...</span>
            </div>
          ) : !order ? (
            <div className="text-center py-12 text-[#3A3A3A]">Order not found</div>
          ) : (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User size={18} className="text-[#FF7A19]" />
                    <h3 className="font-semibold text-[#1A1A1A]">Customer Information</h3>
                  </div>
                  <div className="text-sm text-[#1A1A1A] space-y-1">
                    {(order.customer_bio?.name || order.customer_name) && (
                      <p className="font-medium">Name: {order.customer_bio?.name || order.customer_name}</p>
                    )}
                    {(order.customer_bio?.email || order.customer_email) && (
                      <p className="text-[#3A3A3A]">Email: {order.customer_bio?.email || order.customer_email}</p>
                    )}
                    {order.customer_bio?.phone && (
                      <p className="text-[#3A3A3A]">Phone: {order.customer_bio.phone}</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={18} className="text-[#FF7A19]" />
                    <h3 className="font-semibold text-[#1A1A1A]">Order Date</h3>
                  </div>
                  <p className="text-sm text-[#1A1A1A]">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package size={18} className="text-[#FF7A19]" />
                    <h3 className="font-semibold text-[#1A1A1A]">Status</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(e.target.value)}
                      className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#FF7A19] ml-2"
                      disabled={updatingStatus || order.status === 'delivered' || order.status === 'cancelled'}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard size={18} className="text-[#FF7A19]" />
                    <h3 className="font-semibold text-[#1A1A1A]">Payment</h3>
                  </div>
                  <div className="space-y-1">
                    {getPaymentStatusBadge(order.payment_status)}
                    <p className="text-xs text-[#3A3A3A] mt-1 capitalize">{order.payment_method}</p>
                  </div>
                </div>
              </div>

              {/* Pre-Order Shipping Info */}
              {order.is_pre_order && (
                <div className="bg-orange-50 border-l-4 border-[#FF7A19] rounded-lg p-4">
                  <h3 className="font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
                    <Package size={18} className="text-[#FF7A19]" />
                    Pre-Order Shipping Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    {order.pre_order_shipping_option && (
                      <div className="flex justify-between">
                        <span className="text-[#3A3A3A]">Shipping Method:</span>
                        <span className="font-medium text-[#1A1A1A] capitalize">
                          {order.pre_order_shipping_option.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                    {order.estimated_arrival_date && (
                      <div className="flex justify-between">
                        <span className="text-[#3A3A3A]">Estimated Arrival:</span>
                        <span className="font-medium text-[#1A1A1A]">
                          {new Date(order.estimated_arrival_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <p className="text-xs text-orange-800">
                        <strong>Note:</strong> Full payment is required upfront for pre-orders. Items will be shipped according to the selected shipping method.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Details */}
              {order.shipping_address && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={18} className="text-[#FF7A19]" />
                    <h3 className="font-semibold text-[#1A1A1A]">Delivery Details</h3>
                  </div>
                  <div className="text-sm text-[#1A1A1A] space-y-2">
                    {/* New delivery structure */}
                    {order.shipping_address.gadget_name && (
                      <p><strong>Gadget Name:</strong> {order.shipping_address.gadget_name}</p>
                    )}
                    {order.shipping_address.recipient_name && (
                      <p><strong>Recipient Name:</strong> {order.shipping_address.recipient_name}</p>
                    )}
                    {order.shipping_address.recipient_number && (
                      <p><strong>Recipient Number:</strong> {order.shipping_address.recipient_number}</p>
                    )}
                    {order.shipping_address.recipient_location && (
                      <p><strong>Recipient Location:</strong> {order.shipping_address.recipient_location}</p>
                    )}
                    {order.shipping_address.recipient_region && (
                      <p><strong>Recipient Region:</strong> {order.shipping_address.recipient_region}</p>
                    )}
                    {order.shipping_address.alternate_contact_number && (
                      <p><strong>Alternate Contact:</strong> {order.shipping_address.alternate_contact_number}</p>
                    )}
                    
                    {/* Legacy structure (fallback) */}
                    {!order.shipping_address.gadget_name && order.shipping_address.full_name && (
                      <p>{order.shipping_address.full_name}</p>
                    )}
                    {!order.shipping_address.recipient_location && order.shipping_address.street_address && (
                      <p>{order.shipping_address.street_address}</p>
                    )}
                    {!order.shipping_address.recipient_region && order.shipping_address.city && (
                      <p>
                        {order.shipping_address.city}
                        {order.shipping_address.region && `, ${order.shipping_address.region}`}
                        {order.shipping_address.postal_code && ` ${order.shipping_address.postal_code}`}
                      </p>
                    )}
                    {order.shipping_address.country && <p>{order.shipping_address.country}</p>}
                    {!order.shipping_address.recipient_number && order.shipping_address.phone && (
                      <p className="mt-2">Phone: {order.shipping_address.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-4">Order Items</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-[#1A1A1A]">Product</th>
                        <th className="text-left px-4 py-3 text-sm font-semibold text-[#1A1A1A]">Quantity</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-[#1A1A1A]">Price</th>
                        <th className="text-right px-4 py-3 text-sm font-semibold text-[#1A1A1A]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.product_image || '/placeholder-product.webp'}
                                  alt={item.product_name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-[#1A1A1A]">{item.product_name}</p>
                                    {(item.is_pre_order || order.is_pre_order) && (
                                      <span className="px-2 py-0.5 bg-black text-white text-xs font-semibold rounded">
                                        Pre-Order
                                      </span>
                                    )}
                                  </div>
                                  {item.selected_variants && (
                                    <p className="text-xs text-[#3A3A3A]">
                                      {Object.entries(item.selected_variants).map(([key, value]) => `${key}: ${value}`).join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-[#3A3A3A]">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-right text-[#3A3A3A]">
                              GHS {(item.unit_price || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-[#1A1A1A]">
                              {/* ✅ Use backend's total_price directly - already in GHS, NO calculation */}
                              GHS {(item.total_price ?? item.subtotal ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-[#3A3A3A]">
                            No items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-[#1A1A1A] mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#3A3A3A]">Subtotal:</span>
                    <span className="font-medium text-[#1A1A1A]">GHS {order.subtotal.toFixed(2)}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#3A3A3A]">Discount:</span>
                      <span className="font-medium text-[#1A1A1A]">-GHS {order.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {order.shipping_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#3A3A3A]">
                        {order.is_pre_order ? 'Pre-Order Shipping:' : 'Shipping:'}
                      </span>
                      <span className="font-medium text-[#1A1A1A]">GHS {order.shipping_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {order.tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#3A3A3A]">Tax:</span>
                      <span className="font-medium text-[#1A1A1A]">GHS {order.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-300">
                    <span className="font-semibold text-[#1A1A1A]">Total:</span>
                    <span className="font-bold text-lg text-[#FF7A19]">GHS {order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-[#1A1A1A] mb-2">Order Notes</h3>
                  <p className="text-sm text-[#3A3A3A]">{order.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between sticky bottom-0 bg-white">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPDF} disabled={!order || loading}>
              <Download size={18} className="mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

