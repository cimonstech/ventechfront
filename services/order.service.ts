import { supabase } from '@/lib/supabase';
import { CheckoutData, Order } from '@/types/order';

export const orderService = {
  // Create new order (supports guest checkout with null userId)
  // Uses backend API to handle emails and notifications
  async createOrder(checkoutData: CheckoutData, userId: string | null) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    // Calculate totals
    const subtotal = checkoutData.items.reduce((sum, item) => sum + item.subtotal, 0);
    const deliveryFee = checkoutData.delivery_option.price;
    const tax = subtotal * 0.0; // Ghana VAT if applicable
    const total = subtotal + deliveryFee + tax;

    // Generate order number in format: ORD-XXXDDMM
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dateStr = `${day}${month}`;
    
    // Count orders created today (via backend API or use timestamp)
    const orderNumberForDay = String(Date.now()).slice(-3);
    const orderNumber = `ORD-${orderNumberForDay}${dateStr}`;

    // Map items for backend
    const order_items = checkoutData.items.map((item) => ({
      product_id: item.id,
      product_name: item.name,
      product_image: item.thumbnail,
      quantity: item.quantity,
      unit_price: item.discount_price || item.original_price,
      subtotal: item.subtotal,
      selected_variants: item.selected_variants,
    }));

    // Try to call backend API first, fallback to Supabase if it fails
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          order_number: orderNumber,
          subtotal,
          discount: 0,
          tax,
          delivery_fee: deliveryFee,
          total,
          payment_method: checkoutData.payment_method,
          delivery_address: checkoutData.delivery_address,
          delivery_option: checkoutData.delivery_option,
          notes: checkoutData.notes || null,
          payment_reference: checkoutData.payment_reference || null, // Include payment reference for transaction linking
          order_items,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.data;
      } else {
        throw new Error('Backend API failed');
      }
    } catch (apiError) {
      // Fallback to direct Supabase insert if backend API fails
      console.warn('Backend API failed, using Supabase fallback:', apiError);
      
      const { supabase } = await import('@/lib/supabase');
      
      // Create order directly in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: userId,
            order_number: orderNumber,
            status: 'pending',
            subtotal,
            discount: 0,
            delivery_fee: deliveryFee,
            tax,
            total,
            payment_method: checkoutData.payment_method,
            payment_status: 'pending',
            delivery_address: checkoutData.delivery_address,
            delivery_option: checkoutData.delivery_option,
            notes: checkoutData.notes,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = checkoutData.items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        product_image: item.thumbnail,
        quantity: item.quantity,
        unit_price: item.discount_price || item.original_price,
        subtotal: item.subtotal,
        selected_variants: item.selected_variants,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return order;
    }
  },

  // Get user orders
  async getUserOrders(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  },

  // Get order by ID
  async getOrderById(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .single();

    if (error) throw error;

    return data;
  },

  // Get order by order number
  async getOrderByNumber(orderNumber: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('order_number', orderNumber)
      .single();

    if (error) throw error;

    return data;
  },

  // Update order status (Admin)
  async updateOrderStatus(orderId: string, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  // Update payment status
  async updatePaymentStatus(orderId: string, paymentStatus: string, reference?: string) {
    const updates: any = { payment_status: paymentStatus };
    
    if (reference) {
      updates.payment_reference = reference;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  // Get all orders (Admin)
  async getAllOrders(page: number = 1, limit: number = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('orders')
      .select('*, items:order_items(*), user:users(full_name, email)', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      orders: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  },

  // Cancel order
  async cancelOrder(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    return data;
  },
};


