'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ChevronRight, Trash2, Star, ShoppingCart } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import { wishlistService } from '@/services/wishlist.service';
import { ProductCard } from '@/components/cards/ProductCard';
import { removeFromWishlist, setWishlistItems } from '@/store/wishlistSlice';
import { formatCurrency, calculateDiscountPercentage } from '@/lib/helpers';
import { addToCart } from '@/store/cartSlice';
import { useWishlist } from '@/hooks/useWishlist';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';

interface WishlistItem {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product: any; // Using any to match ProductCard expectations
}

export default function WishlistPage() {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { toggleItem } = useWishlist();
  const [wishlistItems, setLocalWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWishlist();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const fetchWishlist = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const items = await wishlistService.getWishlist(user.id);
      // Filter out items with invalid product data - ensure product exists and has required fields
      const validItems = items.filter(item => 
        item.product && 
        item.product.id &&
        item.product_id &&
        (item.product.original_price !== undefined || item.product.discount_price !== undefined || (item.product as any).price !== undefined)
      );
      setLocalWishlistItems(validItems);
      // Update Redux state to sync wishlist count
      const productIds = validItems.map(item => item.product_id).filter(Boolean);
      dispatch(setWishlistItems(productIds));
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      toast.error('Failed to load wishlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (productId: string) => {
    if (!user) return;

    try {
      const success = await wishlistService.removeFromWishlist(user.id, productId);
      if (success) {
        setLocalWishlistItems(prev => prev.filter(item => item.product_id !== productId));
        // Update Redux state to sync wishlist count
        dispatch(removeFromWishlist(productId));
        toast.success('Removed from wishlist');
      } else {
        toast.error('Failed to remove from wishlist');
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove from wishlist');
    }
  };

  const handleMoveToCart = async (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();

    const isPreOrder = (product as any).is_pre_order === true;
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

    // Remove from wishlist - ensure database and Redux state are synced
    try {
      if (user) {
        const success = await wishlistService.removeFromWishlist(user.id, product.id);
        if (success) {
          // Update local state
          setLocalWishlistItems(prev => prev.filter(item => item.product_id !== product.id));
          // Update Redux state
          dispatch(removeFromWishlist(product.id));
          // Refresh wishlist to ensure sync
          await fetchWishlist();
        }
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }

    toast.success(isPreOrder ? `${product.name} moved to pre-order cart!` : `${product.name} moved to cart!`);
  };


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">Please Login</h2>
            <p className="text-[#3A3A3A] mb-6">You need to be logged in to view your wishlist.</p>
            <Link
              href="/login"
              className="inline-block bg-[#FF7A19] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#FF8C3A] transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#3A3A3A] mb-6">
          <Link href="/" className="hover:text-[#FF7A19]">Home</Link>
          <ChevronRight size={16} />
          <span className="text-[#FF7A19]">Wishlist</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">My Wishlist</h1>
          <p className="text-[#3A3A3A]">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>

        {wishlistItems.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-[#FF7A19]" />
            </div>
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">Your Wishlist is Empty</h2>
            <p className="text-[#3A3A3A] mb-6 max-w-md mx-auto">
              Save products you love so you can easily find them later!
            </p>
            <Link
              href="/shop"
              className="inline-block bg-[#FF7A19] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#FF8C3A] transition-colors"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          /* Wishlist Items */
          <>
            {/* Mobile: Horizontal Layout */}
            <div className="md:hidden space-y-4">
              {wishlistItems
                .filter(item => item.product && item.product.id && item.id)
                .map((item) => {
                  const product = item.product;
                  const hasDiscount = product.discount_price && product.discount_price < product.original_price;
                  const discountPercentage = hasDiscount
                    ? calculateDiscountPercentage(product.original_price, product.discount_price!)
                    : 0;
                  const isPreOrder = (product as any).is_pre_order === true;
                  
                  // Get key specs
                  let keySpecs: Array<{ label: string; color: string }> | undefined = product.key_specs;
                  if (keySpecs && typeof keySpecs === 'string') {
                    try {
                      const parsed = JSON.parse(keySpecs);
                      keySpecs = Array.isArray(parsed) ? parsed : undefined;
                    } catch (e) {
                      keySpecs = undefined;
                    }
                  }
                  const keySpecsArray = (keySpecs && Array.isArray(keySpecs) && keySpecs.length > 0) 
                    ? keySpecs.slice(0, 6).map(spec => ({
                        label: spec.label || '',
                        color: spec.color || '#9333ea',
                      }))
                    : [];

                  const rating = typeof product.rating === 'number' && !isNaN(product.rating) 
                    ? product.rating 
                    : 0;
                  const displayRating = rating.toFixed(1);

                  return (
                    <Link key={item.id || item.product_id} href={`/product/${product.slug}`}>
                      <div className="relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex">
                          {/* Image on Left */}
                          <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden bg-gray-50">
                            <Image
                              src={product.thumbnail || '/placeholders/placeholder-product.webp'}
                              alt={product.name}
                              fill
                              sizes="128px"
                              className="object-cover"
                              loading="eager"
                            />
                            {/* Badges */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1">
                              {hasDiscount && (
                                <Badge variant="error" size="sm">
                                  -{discountPercentage}%
                                </Badge>
                              )}
                              {isPreOrder && (
                                <Badge size="sm" className="!bg-black !text-white font-semibold text-[8px]">
                                  PREORDER
                                </Badge>
                              )}
                            </div>
                            {/* Rating */}
                            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 flex items-center gap-0.5">
                              <Star size={8} className="fill-yellow-400 text-yellow-400" />
                              <span className="text-[8px] font-medium text-[#1A1A1A]">{displayRating}</span>
                            </div>
                          </div>

                          {/* Content on Right */}
                          <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                            <div className="flex-1">
                              {/* Brand */}
                              <p className="text-[8px] text-[#FF7A19] font-medium uppercase tracking-wide mb-0.5">
                                {product.brand}
                              </p>
                              {/* Product Name */}
                              <p className="text-[10px] font-semibold text-[#1A1A1A] mb-1.5 line-clamp-2 leading-tight">
                                {product.name}
                              </p>
                              {/* Key Specs */}
                              {keySpecsArray.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {keySpecsArray.map((spec, index) => (
                                    <span
                                      key={index}
                                      className="text-white text-[7px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap"
                                      style={{ backgroundColor: spec.color }}
                                    >
                                      {spec.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* Description when no key specs */}
                              {keySpecsArray.length === 0 && product.description && (
                                <p className="text-[8px] text-gray-600 mb-2 line-clamp-2 leading-tight">
                                  {product.description.length > 50 
                                    ? `${product.description.substring(0, 50)}...` 
                                    : product.description}
                                </p>
                              )}
                            </div>
                            {/* Price with Add to Cart Icon */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-[#FF7A19] text-sm font-bold">
                                  {formatCurrency(product.discount_price || product.original_price || 0)}
                                </span>
                                {hasDiscount && (
                                  <span className="text-[9px] text-[#3A3A3A] line-through">
                                    {formatCurrency(product.original_price)}
                                  </span>
                                )}
                              </div>
                              {/* Add to Cart Icon Button */}
                              <button
                                onClick={(e) => handleMoveToCart(e, product)}
                                disabled={!isPreOrder && !product.in_stock}
                                className={`p-1.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                                  isPreOrder || product.in_stock
                                    ? 'bg-[#FF7A19] hover:bg-orange-600 text-white' 
                                    : 'bg-gray-300 text-gray-500'
                                }`}
                                title={!isPreOrder && !product.in_stock ? 'Out of Stock' : 'Add to Cart'}
                              >
                                <ShoppingCart size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Remove Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveFromWishlist(item.product_id);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors z-10"
                          title="Remove from wishlist"
                        >
                          <Trash2 size={14} className="text-red-600" />
                        </button>
                      </div>
                    </Link>
                  );
                })}
            </div>

            {/* Desktop: Standard Grid Layout */}
            <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {wishlistItems
                .filter(item => item.product && item.product.id && item.id)
                .map((item) => (
                  <div key={item.id || item.product_id} className="relative group">
                    {item.product && (
                      <>
                        <ProductCard 
                          product={item.product} 
                          onQuickView={() => {}} // No quick view needed in wishlist
                        />
                        {/* Remove from Wishlist Button - positioned over the card */}
                        <button
                          onClick={() => handleRemoveFromWishlist(item.product_id)}
                          className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 z-10"
                          title="Remove from wishlist"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}


