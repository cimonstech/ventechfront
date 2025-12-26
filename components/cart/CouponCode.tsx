'use client';

import React, { useState } from 'react';
import { Tag, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { couponService } from '@/services/coupon.service';
import { CouponValidation } from '@/types/coupon';
import toast from 'react-hot-toast';

interface CouponCodeProps {
  onCouponApplied: (validation: CouponValidation) => void;
  onCouponRemoved: () => void;
  cartTotal: number;
  appliedCoupon?: CouponValidation | null;
  userId?: string | null;
}

export const CouponCode: React.FC<CouponCodeProps> = ({
  onCouponApplied,
  onCouponRemoved,
  cartTotal,
  appliedCoupon,
  userId
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const validation = await couponService.validateCoupon(code.trim().toUpperCase(), cartTotal, userId);
      
      if (validation.is_valid) {
        onCouponApplied(validation);
        setCode('');
        toast.success('Coupon applied successfully!');
      } else {
        setError(validation.error_message);
        toast.error(validation.error_message);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      setError('Failed to apply coupon. Please try again.');
      toast.error('Failed to apply coupon');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    onCouponRemoved();
    setCode('');
    setError('');
    toast.success('Coupon removed');
  };

  const getDiscountText = (validation: CouponValidation) => {
    if (validation.discount_amount === 0) {
      return 'Free delivery applied';
    }
    return `GHS ${validation.discount_amount.toFixed(2)} discount applied`;
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-5 h-5 text-[#FF7A19]" />
        <h3 className="font-semibold text-[#1A1A1A]">Coupon Code</h3>
      </div>

      {appliedCoupon ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  {appliedCoupon.discount_amount === 0 ? 'Free Delivery' : 'Coupon Applied'}
                </p>
                <p className="text-xs text-green-600">
                  {getDiscountText(appliedCoupon)}
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleApplyCoupon} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19] text-sm"
              maxLength={8}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isLoading || !code.trim()}
              className="px-4"
            >
              {isLoading ? 'Applying...' : 'Apply'}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-xs text-gray-500">
            <p>• Enter your coupon code above</p>
            <p>• Coupons are case-insensitive</p>
            <p>• Some coupons may have minimum order requirements</p>
          </div>
        </form>
      )}
    </div>
  );
};

