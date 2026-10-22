'use client';

import React, { useState, useLayoutEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { useAppSelector, useAppDispatch } from '@/store';
import { removeFromCart, updateQuantity } from '@/store/cartSlice';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';
import { taxService } from '@/services/tax.service';
import { discountService } from '@/services/discount.service';
import { CouponCode } from '@/components/cart/CouponCode';
import { CouponValidation } from '@/types/coupon';
import { couponService } from '@/services/coupon.service';
import { deliveryOptionsService } from '@/services/deliveryOptions.service';
import { PRE_ORDER_SHIPPING_OPTIONS } from '@/services/preOrder.service';
import toast from 'react-hot-toast';

const FREE_DELIVERY_THRESHOLD = 20000;

export default function CartPage() {
  const dispatch = useAppDispatch();
  const { items, total, itemCount } = useAppSelector((state) => state.cart);
  const { user } = useAppSelector((state) => state.auth);
  const [taxAmount, setTaxAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [standardDelivery, setStandardDelivery] = useState<{ name: string; price: number } | null>(null);

  React.useEffect(() => {
    deliveryOptionsService.getActiveDeliveryOptions().then((options) => {
      const first = options[0];
      setStandardDelivery(first ? { name: first.name, price: first.price } : { name: 'Delivery', price: 0 });
    });
  }, []);

  // First paint matches the server. The saved cart is applied before the browser paints.
  useLayoutEffect(() => {
    setMounted(true);
    // Load coupon from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const storedCoupon = sessionStorage.getItem('applied_coupon');
      if (storedCoupon) {
        try {
          setAppliedCoupon(JSON.parse(storedCoupon));
        } catch (e) {
          console.error('Error parsing stored coupon:', e);
        }
      }
    }
  }, []);

  // Clear coupon when cart becomes empty (after order completion)
  React.useEffect(() => {
    if (items.length === 0 && appliedCoupon) {
      setAppliedCoupon(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('applied_coupon');
      }
    }
  }, [items.length, appliedCoupon]);

  // The saved discount belongs to the cart it was checked against.
  // Quantity and product changes must be checked again before the total is shown.
  React.useEffect(() => {
    if (!mounted || !appliedCoupon || items.length === 0) return;

    let cancelled = false;

    couponService.refreshAppliedCoupon(appliedCoupon, total).then((result) => {
      if (cancelled) return;

      if (result.removedMessage) {
        setAppliedCoupon(null);
        sessionStorage.removeItem('applied_coupon');
        toast.error(result.removedMessage);
      } else if (result.coupon) {
        setAppliedCoupon(result.coupon);
        sessionStorage.setItem('applied_coupon', JSON.stringify(result.coupon));
        if (result.changed) {
          toast.success('Coupon updated for the current cart');
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mounted, total, items.length, appliedCoupon?.code]);

  const handleRemoveItem = (productId: string) => {
    dispatch(removeFromCart(productId));
    toast.success('Item removed from cart');
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    dispatch(updateQuantity({ id: productId, quantity }));
  };

  const regularSubtotal = items
    .filter((item) => !item.is_pre_order)
    .reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  const hasRegularItems = items.some((item) => !item.is_pre_order);
  const hasPreOrderItems = items.some((item) => item.is_pre_order);
  const regularDeliveryFee = !hasRegularItems
    ? 0
    : regularSubtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : (standardDelivery?.price ?? 0);
  const preOrderDeliveryFee = hasPreOrderItems ? PRE_ORDER_SHIPPING_OPTIONS[0].price : 0;
  const deliveryFee = regularDeliveryFee + preOrderDeliveryFee;
  const couponDiscount = appliedCoupon?.discount_amount || 0;
  const totalDiscount = discountAmount + couponDiscount;
  const grandTotal = Math.max(0, total + deliveryFee + taxAmount - totalDiscount);

  const handleCouponApplied = (validation: CouponValidation) => {
    setAppliedCoupon(validation);
    // Store coupon in sessionStorage so checkout can access it
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('applied_coupon', JSON.stringify(validation));
    }
  };

  const handleCouponRemoved = () => {
    setAppliedCoupon(null);
    // Remove coupon from sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('applied_coupon');
    }
  };

  // Calculate taxes and discounts when cart changes
  React.useEffect(() => {
    const calculateTaxesAndDiscounts = async () => {
      if (total === 0) {
        setTaxAmount(0);
        setDiscountAmount(0);
        return;
      }

      setIsCalculating(true);
      try {
        // Calculate tax
        const tax = await taxService.calculateTax(total, 'all');
        setTaxAmount(tax);

        // Calculate discount (excluding coupon discount)
        const discount = await discountService.calculateDiscount(total, 'all');
        setDiscountAmount(discount);
      } catch (error) {
        console.error('Error calculating taxes and discounts:', error);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateTaxesAndDiscounts();
  }, [total]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="text-gray-400" size={48} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Add some products to get started</p>
          <Link href="/shop">
            <Button variant="primary" size="lg" icon={<ShoppingBag size={20} />}>
              Start Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Shopping Cart</h1>
          {hasRegularItems && hasPreOrderItems && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4">
              Regular items and pre-order items ship separately. Checkout will place two orders.
            </p>
          )}
          <p className="text-xs sm:text-sm text-gray-600">{itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {items.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="p-6 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={item.thumbnail || '/placeholder-product.webp'}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <Link
                        href={`/product/${item.slug}`}
                        className="text-xs sm:text-sm font-semibold text-gray-900 hover:text-[#FF7A19] mb-1 block"
                      >
                        {item.name}
                      </Link>
                      <p className="text-[10px] sm:text-xs text-gray-500 mb-2">{item.brand}</p>

                      {/* Variants */}
                      {Object.keys(item.selected_variants || {}).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {Object.values(item.selected_variants || {}).map((variant: any) => (
                            <span
                              key={variant.id}
                              className="text-[9px] sm:text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded"
                            >
                              {variant.name}: {variant.value}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-xs sm:text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                          disabled={item.quantity >= item.stock_quantity}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Price - Under quantity selector */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base font-bold text-[#FF7A19]">
                          {formatCurrency(item.subtotal)}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-600 hover:text-red-700 p-1.5"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Continue Shopping */}
          <Link href="/shop">
            <Button variant="outline" size="lg" className="w-full mt-4">
              Continue Shopping
            </Button>
          </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 space-y-4">
            {/* Coupon Code */}
            <CouponCode
              onCouponApplied={handleCouponApplied}
              onCouponRemoved={handleCouponRemoved}
              cartTotal={total}
              appliedCoupon={appliedCoupon}
              userId={user?.id || null}
            />

            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({itemCount} items)</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Auto Discount</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span>-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                
                {taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (VAT)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span>
                    {standardDelivery === null && hasRegularItems && regularSubtotal < FREE_DELIVERY_THRESHOLD
                      ? '...'
                      : deliveryFee === 0
                        ? 'FREE'
                        : formatCurrency(deliveryFee)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {regularSubtotal >= FREE_DELIVERY_THRESHOLD && hasRegularItems
                    ? 'Free delivery on orders from GH₵ 20,000.'
                    : `${standardDelivery?.name ?? 'Delivery'} is included. You can choose another option at checkout.`}
                  {hasPreOrderItems ? ' Pre-order shipping shown is air cargo.' : ''}
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              <Link href="/checkout">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  icon={<ArrowRight size={20} />}
                >
                  Proceed to Checkout
                </Button>
              </Link>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span>✓</span>
                  <span>Secure checkout</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span>✓</span>
                  <span>Free returns within 7 days</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>✓</span>
                  <span>Authentic products guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


