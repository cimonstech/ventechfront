import { supabase } from '@/lib/supabase';

export interface Discount {
  id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  minimum_amount: number;
  maximum_discount?: number;
  is_active: boolean;
  valid_from: string;
  valid_until?: string;
  usage_limit?: number;
  used_count: number;
  applies_to: 'all' | 'products' | 'shipping' | 'total';
  created_at: string;
  updated_at: string;
}

export const discountService = {
  // Get all discounts
  async getDiscounts(): Promise<Discount[]> {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching discounts:', error);
      return [];
    }
  },

  // Get active discounts
  async getActiveDiscounts(): Promise<Discount[]> {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .lte('valid_from', new Date().toISOString())
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active discounts:', error);
      return [];
    }
  },

  // Create discount
  async createDiscount(discount: Omit<Discount, 'id' | 'created_at' | 'updated_at' | 'used_count'>): Promise<Discount | null> {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .insert([{ ...discount, used_count: 0 }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating discount:', error);
      return null;
    }
  },

  // Update discount
  async updateDiscount(id: string, discount: Partial<Discount>): Promise<Discount | null> {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .update(discount)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating discount:', error);
      return null;
    }
  },

  // Delete discount
  async deleteDiscount(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting discount:', error);
      return false;
    }
  },

  // Calculate discount for an amount
  async calculateDiscount(amount: number, type: string = 'all'): Promise<number> {
    try {
      // Try RPC function first (if it exists)
      const { data, error } = await supabase
        .rpc('calculate_discount', { amount, discount_type: type });

      if (!error && data !== null && data !== undefined) {
        return data || 0;
      }

      // If RPC doesn't exist or fails, fallback to direct query
      if (error && error.code !== 'PGRST202') {
        // Only log non-404 errors (function not found is expected)
        console.debug('RPC calculate_discount failed, using fallback:', {
          message: error.message,
          code: error.code,
        });
      }

      // Fallback: Direct query to get active discounts and calculate manually
      const now = new Date().toISOString();
      const { data: discounts, error: queryError } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .lte('valid_from', now)
        .gte('valid_until', now)
        .or(`applies_to.eq.${type},applies_to.eq.all`);

      if (queryError) {
        // If discounts table doesn't exist, just return 0
        if (queryError.code === '42P01' || queryError.message?.includes('does not exist')) {
          return 0;
        }
        console.debug('Error fetching discounts for calculation:', {
          message: queryError.message,
          code: queryError.code,
        });
        return 0;
      }

      if (!discounts || discounts.length === 0) {
        return 0;
      }

      // Calculate discount from active discounts
      let totalDiscount = 0;
      for (const discount of discounts) {
        if (amount < discount.minimum_amount) {
          continue; // Skip if minimum amount not met
        }

        if (discount.usage_limit && discount.used_count >= discount.usage_limit) {
          continue; // Skip if usage limit reached
        }

        let discountAmount = 0;
        if (discount.type === 'percentage') {
          discountAmount = (amount * discount.value) / 100;
          if (discount.maximum_discount && discountAmount > discount.maximum_discount) {
            discountAmount = discount.maximum_discount;
          }
        } else if (discount.type === 'fixed_amount') {
          discountAmount = discount.value;
          if (discountAmount > amount) {
            discountAmount = amount;
          }
        } else if (discount.type === 'free_shipping') {
          // Free shipping doesn't affect cart total, handled at checkout
          discountAmount = 0;
        }

        totalDiscount += discountAmount;
      }

      // Don't exceed the cart amount
      return totalDiscount > amount ? amount : totalDiscount;
    } catch (error: any) {
      // Extract error information properly
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorCode = error?.code || error?.status || 'UNKNOWN';
      
      // Only log if it's not a "function not found" error
      if (errorCode !== 'PGRST202' && !errorMessage.includes('function') && !errorMessage.includes('not found')) {
        console.error('Error calculating discount:', {
          message: errorMessage,
          code: errorCode,
          errorType: error?.constructor?.name || typeof error,
        });
      }
      
      // Return 0 on any error (graceful degradation)
      return 0;
    }
  },

  // Increment usage count
  async incrementUsage(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('discounts')
        .update({ used_count: ((await supabase.from('discounts').select('used_count').eq('id', id).single()).data?.used_count || 0) + 1 })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }
  },
};
