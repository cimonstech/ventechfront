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

    // Generate order number in format: ORD-XXXDDMMYY
    // XXX = sequential order number, DDMMYY = date (e.g., 041125 = 4th Nov 2025)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const dateStr = `${day}${month}${year}`;
    
    // Generate sequential order number (using timestamp last 3 digits for uniqueness)
    // In production, this should be fetched from backend to ensure sequential numbering
    const orderNumberSequence = String(Date.now()).slice(-3);
    const orderNumber = `ORD-${orderNumberSequence}${dateStr}`;

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
          delivery_address: checkoutData.delivery_address, // Backend will map this to shipping_address
          delivery_option: checkoutData.delivery_option,
          notes: checkoutData.notes || null,
          payment_reference: checkoutData.payment_reference || null, // Include payment reference for transaction linking
          order_items,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data;
        } else {
          throw new Error(result.message || 'Order creation failed');
        }
      } else {
        // Try to parse error response
        let errorMessage = 'Backend API failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('Backend API error response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          });
        } catch (parseError) {
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
          console.error('Backend API error (non-JSON):', {
            status: response.status,
            statusText: response.statusText,
          });
        }
        throw new Error(errorMessage);
      }
    } catch (apiError: any) {
      // Fallback to direct Supabase insert if backend API fails
      console.warn('Backend API failed, using Supabase fallback:', {
        error: apiError,
        message: apiError?.message,
        stack: apiError?.stack,
      });
      
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
            shipping_fee: deliveryFee, // Use shipping_fee instead of delivery_fee
            tax,
            total,
            payment_method: checkoutData.payment_method,
            payment_status: 'pending',
            shipping_address: checkoutData.delivery_address, // Map to shipping_address
            notes: checkoutData.notes,
          },
        ])
        .select()
        .single();

      if (orderError) {
        console.error('Supabase order creation error:', {
          error: orderError,
          message: orderError.message,
          code: orderError.code,
          details: orderError.details,
          hint: orderError.hint,
        });
        throw new Error(orderError.message || 'Failed to create order');
      }

      // Create order items
      const orderItems = checkoutData.items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        product_image: item.thumbnail,
        quantity: item.quantity,
        unit_price: item.discount_price || item.original_price,
        total_price: item.subtotal, // Use total_price as per schema
        selected_variants: item.selected_variants,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Supabase order items creation error:', {
          error: itemsError,
          message: itemsError.message,
          code: itemsError.code,
          details: itemsError.details,
          hint: itemsError.hint,
        });
        throw new Error(itemsError.message || 'Failed to create order items');
      }

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


