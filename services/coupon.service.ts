import { authHeaders } from '@/lib/authHeaders';
import { apiRequest, toApiError } from '@/lib/api';
import { Coupon, CreateCouponData, CouponValidation } from '@/types/coupon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const couponService = {
  // Validate coupon code
  async validateCoupon(code: string, cartAmount: number = 0, _userId?: string | null): Promise<CouponValidation> {
    try {
      const response = await fetch(`${API_URL}/api/coupons/validate`, {
        method: 'POST',
        headers: {
          ...(await authHeaders()),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          cart_amount: cartAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          is_valid: false,
          discount_amount: 0,
          error_message: errorData.message || 'Failed to validate coupon',
        };
      }

      const result = await response.json();
      if (result.success && result.data) {
        return {
          is_valid: result.data.is_valid,
          discount_amount: result.data.discount_amount || 0,
          error_message: result.data.error_message || '',
          coupon_id: result.data.coupon_id,
          coupon_name: result.data.coupon_name,
          discount_type: result.data.discount_type,
          applies_to: result.data.applies_to,
        };
      }

      return {
        is_valid: false,
        discount_amount: 0,
        error_message: result.message || 'Invalid coupon code',
      };
    } catch (error: any) {
      console.error('Error validating coupon:', error);
      return {
        is_valid: false,
        discount_amount: 0,
        error_message: 'Failed to validate coupon. Please try again.',
      };
    }
  },

  // Re-check a saved coupon against the cart as it is now.
  // A saved discount is never reused after the cart changes.
  async refreshAppliedCoupon(
    coupon: CouponValidation | null,
    cartAmount: number
  ): Promise<{ coupon: CouponValidation | null; removedMessage?: string; changed: boolean }> {
    if (!coupon) return { coupon: null, changed: false };

    if (!coupon.code) {
      return {
        coupon: null,
        changed: true,
        removedMessage: 'Apply the coupon again. The cart changed and the saved discount could not be checked.',
      };
    }

    const validation = await this.validateCoupon(coupon.code, cartAmount);
    if (!validation.is_valid) {
      return {
        coupon: null,
        changed: true,
        removedMessage: validation.error_message || 'This coupon does not apply to the current cart.',
      };
    }

    const next: CouponValidation = { ...validation, code: coupon.code };
    return {
      coupon: next,
      changed: next.discount_amount !== coupon.discount_amount,
    };
  },


  // Get all coupons (admin)
  async getAllCoupons(): Promise<Coupon[]> {
    const result = await apiRequest<Coupon[]>('/api/coupons');
    if (!result.ok) throw toApiError(result);
    return result.data || [];
  },

  // Get coupon by ID (admin)
  async getCouponById(id: string): Promise<Coupon | null> {
    try {
      const response = await fetch(`${API_URL}/api/coupons/${id}`, {
        method: 'GET',
        headers: {
          ...(await authHeaders()),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch coupon');
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error fetching coupon:', error);
      return null;
    }
  },

  // Create coupon (admin)
  async createCoupon(couponData: CreateCouponData): Promise<Coupon | null> {
    try {
      const response = await fetch(`${API_URL}/api/coupons`, {
        method: 'POST',
        headers: {
          ...(await authHeaders()),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(couponData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create coupon');
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error creating coupon:', error);
      throw error;
    }
  },

  // Update coupon (admin)
  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
    try {
      const response = await fetch(`${API_URL}/api/coupons/${id}`, {
        method: 'PATCH',
        headers: {
          ...(await authHeaders()),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update coupon');
      }

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error updating coupon:', error);
      throw error;
    }
  },

  // Delete coupon (admin)
  async deleteCoupon(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/coupons/${id}`, {
        method: 'DELETE',
        headers: {
          ...(await authHeaders()),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete coupon');
      }

      const result = await response.json();
      return result.success || false;
    } catch (error) {
      console.error('Error deleting coupon:', error);
      return false;
    }
  },
};
