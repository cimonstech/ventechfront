'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { Product } from '@/types/product';
import { Badge } from '../ui/Badge';
import { formatCurrency, calculateDiscountPercentage, formatPriceRange } from '@/lib/helpers';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToCart } from '@/store/cartSlice';
import { useWishlist } from '@/hooks/useWishlist';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  onQuickView?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView }) => {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const { isInWishlist, toggleItem } = useWishlist();
  
  // Safety check: return null if product is invalid
  if (!product || !product.id) {
    return null;
  }
  
  const isInCart = items.some(item => item.id === product.id);
  const isWishlisted = isInWishlist(product.id);

  const hasDiscount = product.discount_price && product.discount_price < product.original_price;
  const discountPercentage = hasDiscount
    ? calculateDiscountPercentage(product.original_price, product.discount_price!)
    : 0;

  const isPreOrder = (product as any).is_pre_order === true;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const cartItem = {
      ...product,
      quantity: 1,
      selected_variants: {},
      subtotal: product.discount_price || product.original_price || 0,
      is_pre_order: isPreOrder,
    };

    dispatch(
      addToCart({
        product: cartItem,
        quantity: 1,
      })
    );

    // Remove from wishlist if it's in the wishlist
    if (isWishlisted) {
      try {
        await toggleItem(product.id);
      } catch (error) {
        console.error('Error removing from wishlist:', error);
      }
    }

    toast.success(isPreOrder ? `${product.name} added to pre-order cart!` : `${product.name} added to cart!`);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const success = await toggleItem(product.id);
      if (success) {
        toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
      } else {
        toast.error('Failed to update wishlist');
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      toast.error('Failed to update wishlist');
    }
  };

  // Get key specs - prioritize key_specs from admin, fallback to auto-generated from specs
  const getKeySpecs = () => {
    // First, check if product has key_specs (admin-defined)
    // Handle both array and string (JSONB from Supabase might be string)
    let keySpecs: Array<{ label: string; color: string }> | undefined = product.key_specs;
    if (keySpecs && typeof keySpecs === 'string') {
      try {
        const parsed = JSON.parse(keySpecs);
        keySpecs = Array.isArray(parsed) ? parsed : undefined;
      } catch (e) {
        console.warn('Failed to parse key_specs string:', e);
        keySpecs = undefined;
      }
    }
    
    if (keySpecs && Array.isArray(keySpecs) && keySpecs.length > 0) {
      return keySpecs.slice(0, 6).map(spec => ({
        label: spec.label || '',
        color: spec.color || '#9333ea', // Default to purple if color missing
      }));
    }

    // Fallback: Auto-generate from specs (for backward compatibility)
    if (!product.specs || typeof product.specs !== 'object') {
      return [];
    }

    const tags: Array<{ label: string; color: string }> = [];
    const specs = product.specs;

    // Priority order: RAM, Storage, Processor, Screen Size
    // 1. RAM
    if (specs.ram) {
      const ramValue = String(specs.ram).toUpperCase();
      tags.push({
        label: ramValue.includes('RAM') ? ramValue : `${ramValue} RAM`,
        color: '#9333ea' // Purple for RAM
      });
    }

    // 2. Storage
    if (specs.storage) {
      const storageValue = String(specs.storage).toUpperCase();
      tags.push({
        label: storageValue.includes('SSD') || storageValue.includes('HDD') 
          ? storageValue 
          : `${storageValue} SSD`,
        color: '#2563eb' // Blue for Storage
      });
    }

    // 3. Processor
    if (specs.processor) {
      const processorValue = String(specs.processor).toUpperCase();
      // Format processor (e.g., "INTEL I7", "AMD RYZEN 5")
      let formattedProcessor = processorValue;
      if (processorValue.includes('INTEL') || processorValue.includes('I7') || processorValue.includes('I5') || processorValue.includes('I3')) {
        formattedProcessor = processorValue.replace(/INTEL\s*/i, 'INTEL ');
      }
      tags.push({
        label: formattedProcessor,
        color: '#0891b2' // Cyan for Processor
      });
    }

    // 4. Screen Size
    if (specs.screen_size || specs.screen) {
      const screenValue = String(specs.screen_size || specs.screen).toUpperCase();
      // Format screen (e.g., "13 TOUCH 360", "15.6 INCH")
      let formattedScreen = screenValue;
      if (screenValue.includes('TOUCH') || screenValue.includes('360')) {
        formattedScreen = screenValue;
      } else if (screenValue.match(/\d+/)) {
        formattedScreen = `${screenValue} INCH`;
      }
      tags.push({
        label: formattedScreen,
        color: '#16a34a' // Green for Screen Size
      });
    }

    return tags.slice(0, 6); // Return at most 6 tags
  };

  const keySpecs = getKeySpecs();

  // Safely get rating value, defaulting to 0 if undefined/null/NaN
  const rating = typeof product.rating === 'number' && !isNaN(product.rating) 
    ? product.rating 
    : 0;
  const displayRating = rating.toFixed(1);

  return (
    <Link href={`/product/${product.slug}`}>
      <div className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 h-full flex flex-col">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <Image
            src={product.thumbnail || '/placeholders/placeholder-product.webp'}
            alt={`${product.name}${product.brand ? ` by ${product.brand}` : ''} - Buy in Ghana`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            loading="eager"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {hasDiscount && (
              <Badge variant="error" size="sm">
                -{discountPercentage}%
              </Badge>
            )}
            {isPreOrder && (
              <Badge size="sm" className="!bg-black !text-white font-semibold">
                PREORDER
              </Badge>
            )}
            {product.featured && !isPreOrder && (
              <Badge variant="warning" size="sm">
                Featured
              </Badge>
            )}
            {!product.in_stock && !isPreOrder && (
              <Badge variant="default" size="sm">
                Out of Stock
              </Badge>
            )}
          </div>

          {/* Rating - Fixed position on bottom left corner */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
            <Star size={10} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-[#1A1A1A]">{displayRating}</span>
          </div>

          {/* Cart Icon - Top right (opposite of rating), mobile only */}
          <div className="absolute top-3 right-3 z-10 md:hidden">
            <button
              onClick={handleAddToCart}
              disabled={!isPreOrder && !product.in_stock}
              className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md ${
                isInCart 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-[#FF7A19] hover:bg-orange-500'
              }`}
              title={!isPreOrder && !product.in_stock ? 'Out of Stock' : isInCart ? (isPreOrder ? 'In Pre-Order Cart' : 'In Cart') : (isPreOrder ? 'Pre-Order' : 'Add to Cart')}
            >
              <ShoppingCart 
                size={16} 
                className="text-white"
              />
            </button>
          </div>

          {/* Action Buttons - Desktop: Show on hover, Mobile: Show wishlist only (no hover) */}
          {/* Desktop: Wishlist and Quick View on hover */}
          <div className="hidden md:flex absolute top-12 right-3 flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button
              onClick={handleWishlist}
              className="p-2 bg-white rounded-full shadow-md hover:bg-orange-50 transition-colors"
              title="Add to wishlist"
            >
              <Heart
                size={16}
                className={isWishlisted ? 'fill-[#FF7A19] text-[#FF7A19] stroke-black' : 'text-white stroke-black'}
                strokeWidth={2}
              />
            </button>
            {onQuickView && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onQuickView();
                }}
                className="p-2 bg-white rounded-full shadow-md hover:bg-orange-50 transition-colors"
                title="Quick view"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#3A3A3A]"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Mobile: Wishlist only (below cart icon, no circular background, just heart) */}
          <div className="md:hidden absolute top-14 right-3 z-10">
            <button
              onClick={handleWishlist}
              className="p-1"
              title="Add to wishlist"
            >
              <Heart
                size={18}
                className={isWishlisted ? 'fill-[#FF7A19] text-[#FF7A19]' : 'text-white'}
              />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-[14px] md:p-4 flex-1 flex flex-col">
          {/* Brand/Category - Using p tag, smaller than product name */}
          <p className="text-[7px] sm:text-[9px] text-[#FF7A19] font-medium uppercase tracking-wide mb-1">
            {product.brand}
          </p>

          {/* Product Name - Using p tag for easier font-size control */}
          <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-[#1A1A1A] mb-2 line-clamp-2 group-hover:text-[#FF7A19] transition-colors leading-tight">
            {product.name}
          </p>

          {/* Description - Show when no key specs (to fill empty space) */}
          {keySpecs.length === 0 && product.description && (
            <p className="text-[9px] sm:text-[10px] text-gray-600 mb-2 line-clamp-2 leading-tight">
              {product.description.length > 60 
                ? `${product.description.substring(0, 60)}...` 
                : product.description}
            </p>
          )}

          {/* Key Specs - Displayed before price on both mobile and desktop */}
          {keySpecs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 md:mb-3">
              {keySpecs.map((spec, index) => (
                <span
                  key={index}
                  className="text-white text-[9px] sm:text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap"
                  style={{ backgroundColor: spec.color }}
                >
                  {spec.label}
                </span>
              ))}
            </div>
          )}

          {/* Price - Displayed after key specs on both mobile and desktop */}
          <div className="flex items-baseline gap-2 mb-0 md:mb-3 mt-auto flex-wrap">
            {product.price_range?.hasRange ? (
              <span className="text-[#FF7A19] product-card-price-mobile font-bold">
                {formatCurrency(product.price_range.min)} - {formatCurrency(product.price_range.max)}
              </span>
            ) : (
              <>
                <span className="text-[#FF7A19] product-card-price-mobile font-bold">
                  {formatCurrency(product.discount_price || product.original_price || 0)}
                </span>
                {hasDiscount && (
                  <span className="text-[10px] sm:text-xs text-[#3A3A3A] line-through">
                    {formatCurrency(product.original_price)}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Desktop: Add to Cart / Pre-Order Button */}
          <button
            onClick={handleAddToCart}
            disabled={!isPreOrder && !product.in_stock}
            className="hidden md:flex w-full items-center justify-center gap-2 px-4 py-2.5 bg-[#FF7A19] hover:bg-orange-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            title={!isPreOrder && !product.in_stock ? 'Out of Stock' : isInCart ? (isPreOrder ? 'In Pre-Order Cart' : 'In Cart') : (isPreOrder ? 'Pre-Order' : 'Add to Cart')}
          >
            <ShoppingCart size={16} />
            {!isPreOrder && !product.in_stock ? 'Out of Stock' : isInCart ? (isPreOrder ? 'In Pre-Order Cart' : 'In Cart') : (isPreOrder ? 'Pre-Order' : 'Add to Cart')}
          </button>
        </div>
      </div>
    </Link>
  );
};

