import { CartItem } from './product';
import { Address } from './user';

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  delivery_address: Address;
  delivery_option: DeliveryOption;
  tracking_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  delivered_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  unit_price: number;
  subtotal?: number; // Legacy field, prefer total_price
  total_price?: number; // ✅ Backend stores this - use this directly, already in GHS
  selected_variants: {
    [key: string]: {
      type: string;
      name: string;
      value: string;
      price_adjustment: number;
    };
  };
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type PaymentMethod = 'mobile_money' | 'card' | 'cash_on_delivery' | 'paystack';

export interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimated_days?: number;
}

export interface PaymentDetails {
  method: PaymentMethod;
  reference?: string;
  provider?: 'paystack' | 'hubtel';
  phone?: string; // For mobile money
  card_last4?: string; // For card payments
}

export interface OrderTracking {
  order_id: string;
  status: OrderStatus;
  timeline: OrderTrackingEvent[];
}

export interface OrderTrackingEvent {
  status: OrderStatus;
  message: string;
  location?: string;
  timestamp: string;
}

export interface CheckoutData {
  items: CartItem[];
  delivery_address: Partial<Address> | Omit<Address, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
  delivery_option: DeliveryOption;
  payment_method: PaymentMethod;
  notes?: string;
  payment_reference?: string;
  // Optional fields for pre-calculated totals (used for pre-orders and Paystack payments)
  delivery_fee?: number;
  tax?: number;
  discount?: number;
  total?: number;
  // For mixed carts (regular + pre-order items)
  regularItems?: CartItem[];
  preOrderItems?: CartItem[];
  hasRegularItems?: boolean;
  hasPreOrderItems?: boolean;
  pre_order_shipping_option?: string;
  coupon_id?: string;
  coupon_code?: string;
}


