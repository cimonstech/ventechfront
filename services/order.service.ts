import { supabase } from '@/lib/supabase';
import { CheckoutData, Order } from '@/types/order';

export const orderService = {
  // Create new order
  async createOrder(checkoutData: CheckoutData, userId: string) {
    // Generate order number in format: ORD-XXXDDMM
    // First 3 digits: order number for the day (001, 002, etc.)
    // Last 4 digits: day and month (DDMM format, e.g., 0111 = 1st November)
    // Example: ORD-0010111 = first order on 1st November
    
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dateStr = `${day}${month}`; // DDMM format
    
    // Count orders created today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());
    
    const orderNumberForDay = ((count || 0) + 1).toString().padStart(3, '0');
    const orderNumber = `ORD-${orderNumberForDay}${dateStr}`;

    // Calculate totals
    const subtotal = checkoutData.items.reduce((sum, item) => sum + item.subtotal, 0);
    const deliveryFee = checkoutData.delivery_option.price;
    const tax = subtotal * 0.0; // Ghana VAT if applicable
    const total = subtotal + deliveryFee + tax;

    // Create order
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


