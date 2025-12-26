export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
  discount_value: number;
  minimum_amount: number;
  maximum_discount?: number;
  applies_to: 'all' | 'products' | 'shipping' | 'total';
  usage_limit?: number;
  per_user_limit: number;
  used_count: number;
  is_active: boolean;
  valid_from: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CouponValidation {
  is_valid: boolean;
  discount_amount: number;
  error_message: string;
  coupon_id?: string;
  coupon_name?: string;
  discount_type?: 'percentage' | 'fixed_amount' | 'free_shipping';
  applies_to?: 'all' | 'products' | 'shipping' | 'total';
}

export interface CreateCouponData {
  code: string;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
  discount_value: number;
  minimum_amount?: number;
  maximum_discount?: number;
  applies_to?: 'all' | 'products' | 'shipping' | 'total';
  usage_limit?: number;
  per_user_limit?: number;
  is_active?: boolean;
  valid_from?: string;
  valid_until?: string;
}

export interface UpdateCouponData {
  name?: string;
  description?: string;
  discount_type?: 'percentage' | 'fixed_amount' | 'free_shipping';
  discount_value?: number;
  minimum_amount?: number;
  maximum_discount?: number;
  applies_to?: 'all' | 'products' | 'shipping' | 'total';
  usage_limit?: number;
  per_user_limit?: number;
  is_active?: boolean;
  valid_from?: string;
  valid_until?: string;
}

