'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppDispatch } from '@/store';
import { addToCart } from '@/store/cartSlice';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PreOrderProduct, PRE_ORDER_SHIPPING_OPTIONS, formatEstimatedDelivery } from '@/services/preOrder.service';
import { formatCurrency } from '@/lib/helpers';
import { ShoppingCart, Clock, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface PreOrderProductCardProps {
  product: PreOrderProduct;
}

export const PreOrderProductCard: React.FC<PreOrderProductCardProps> = ({ product }) => {
  const dispatch = useAppDispatch();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true);
      
      // Add product to cart with pre-order flag
      const effectivePrice = product.discount_price || product.original_price || 0;
      const cartItem = {
        ...product,
        is_pre_order: true,
        quantity: 1,
        selected_variants: {},
        subtotal: effectivePrice,
      };

      dispatch(addToCart({
        product: cartItem,
        quantity: 1,
        variants: {},
      }));
      toast.success('Added to pre-order cart!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart. Please try again.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Handle price - use original_price
  const originalPrice = product.original_price || 0;
  const discountPrice = product.discount_price || null;
  const price = discountPrice && discountPrice < originalPrice ? discountPrice : originalPrice;
  const hasDiscount = discountPrice && discountPrice < originalPrice && originalPrice > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200 flex flex-col">
      {/* Image Container */}
      <Link href={`/product/${product.slug}`} className="relative aspect-square w-full bg-gray-100 overflow-hidden group">
        <Image
          src={product.thumbnail || product.images[0] || '/placeholders/placeholder-product.webp'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {/* Pre-Order Badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center font-medium rounded-full bg-black text-white text-xs px-2.5 py-1 font-semibold">
            Pre-Order
          </span>
        </div>
        {hasDiscount && originalPrice > 0 && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-red-500 text-white font-semibold">
              {Math.round(((originalPrice - (discountPrice || 0)) / originalPrice) * 100)}% OFF
            </Badge>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Category & Brand */}
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
          {product.category_name && (
            <span>{product.category_name}</span>
          )}
          {product.brand_name && (
            <>
              <span>•</span>
              <span>{product.brand_name}</span>
            </>
          )}
        </div>

        {/* Product Name */}
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-[#FF7A19] transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="mb-3">
          {(product as any).price_range?.hasRange ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#FF7A19]">
                {formatCurrency((product as any).price_range.min)} - {formatCurrency((product as any).price_range.max)}
              </span>
            </div>
          ) : originalPrice > 0 ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#FF7A19]">
                {formatCurrency(price)}
              </span>
              {hasDiscount && (
                <span className="text-sm text-gray-500 line-through">
                  {formatCurrency(originalPrice)}
                </span>
              )}
            </div>
          ) : (
            <div className="text-lg font-semibold text-gray-500">
              Price not available
            </div>
          )}
        </div>

        {/* Shipping Options Info */}
        <div className="mb-4 space-y-2 flex-1">
          <div className="flex items-start gap-2 text-xs">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-gray-700 mb-1">Delivery Options:</p>
              {PRE_ORDER_SHIPPING_OPTIONS.map((option) => (
                <div key={option.id} className="mb-1.5 last:mb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{option.name}:</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(option.price)}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    {formatEstimatedDelivery(option)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={handleAddToCart}
          disabled={isAddingToCart || !product.pre_order_available}
          icon={<ShoppingCart size={18} />}
        >
          {isAddingToCart ? 'Adding...' : 'Add to Pre-Order Cart'}
        </Button>

        {!product.pre_order_available && (
          <p className="text-xs text-red-600 mt-2 text-center">
            Pre-order currently unavailable
          </p>
        )}
      </div>
    </div>
  );
};

