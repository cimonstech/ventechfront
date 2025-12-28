'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProductCard } from '@/components/cards/ProductCard';
import { QuickView } from '@/components/shop/QuickView';
import { Reviews } from '@/components/product/Reviews';
import { ProductVariantSelector } from '@/components/product/ProductVariantSelector';
import { similarProductsService } from '@/services/similarProducts.service';
import { useAppSelector, useAppDispatch } from '@/store';
import { addToCart } from '@/store/cartSlice';
import { 
  Heart, 
  Share2, 
  Star, 
  Shield, 
  Truck,
  RotateCcw,
  Check,
  Minus,
  Plus,
  Package,
  CreditCard,
  Headphones,
  ShoppingCart,
  ChevronLeft,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Product, ProductVariant } from '@/types/product';
import { useWishlist } from '@/hooks/useWishlist';
import { formatCurrency } from '@/lib/helpers';
import { useRouter } from 'next/navigation';

interface ProductContentProps {
  product: Product;
}

export function ProductContent({ product }: ProductContentProps) {
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const { isInWishlist, toggleItem } = useWishlist();
  const router = useRouter();
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<any[]>([]);
  const [variantPrice, setVariantPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [currentRating, setCurrentRating] = useState(product.rating || 0);
  const [currentReviewCount, setCurrentReviewCount] = useState(product.review_count || 0);

  const isInCart = items.some(item => item.id === product.id);
  const hasDiscount = product.discount_price && product.discount_price < product.original_price;
  const discountPercentage = hasDiscount
    ? Math.round(((product.original_price - product.discount_price!) / product.original_price) * 100)
    : 0;

  // Calculate final price
  // variantPrice from ProductVariantSelector includes basePrice + modifiers
  // If variantPrice is 0 or not set, use basePrice as fallback
  const basePrice = product.discount_price || product.original_price || 0;
  const finalPrice = variantPrice > 0 ? variantPrice : basePrice;

  // Debug: Log price values to identify doubling issue
  if (process.env.NODE_ENV === 'development') {
    console.log('Product price debug:', {
      productId: product.id,
      productName: product.name,
      discount_price: product.discount_price,
      original_price: product.original_price,
      basePrice,
      variantPrice,
      finalPrice,
      hasVariants: variantPrice > 0,
    });
  }
  const productImages = product.images && product.images.length > 0 ? product.images : [product.thumbnail || '/placeholders/placeholder-product.webp'];

  useEffect(() => {
    if (product.id) {
      setIsWishlisted(isInWishlist(product.id));
      fetchSimilarProducts();
      fetchReviewStats();
    }
  }, [product.id]);

  // Fetch latest review stats to update rating and review count
  const fetchReviewStats = async () => {
    try {
      const { reviewsService } = await import('@/services/reviews.service');
      const stats = await reviewsService.getReviewStats(product.id);
      if (stats) {
        setCurrentRating(stats.averageRating);
        setCurrentReviewCount(stats.totalReviews);
      }
    } catch (error) {
      console.error('Error fetching review stats:', error);
    }
  };

  const fetchSimilarProducts = async () => {
    try {
      const similar = await similarProductsService.getSimilarProducts(
        product.id,
        product.category_id,
        product.brand_id || '',
        4
      );
      setSimilarProducts(similar);
    } catch (error) {
      console.error('Error fetching similar products:', error);
    }
  };

  const handleVariantChange = (variants: any[], totalPrice: number) => {
    setSelectedVariants(variants);
    // totalPrice from ProductVariantSelector already includes basePrice + modifiers
    // Store the total price (base + modifiers) so we can use it directly
    setVariantPrice(totalPrice);
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => {
      const newQuantity = prev + delta;
      if (newQuantity < 1) return 1;
      if (newQuantity > product.stock_quantity) {
        toast.error(`Only ${product.stock_quantity} items available`);
        return product.stock_quantity;
      }
      return newQuantity;
    });
  };

  const handleAddToCart = () => {
    // Convert new SelectedVariant format to ProductVariant format for cart
    const cartVariants: { [key: string]: ProductVariant } = {};
    
    selectedVariants.forEach((selectedVariant: any) => {
      if (selectedVariant && selectedVariant.option) {
        cartVariants[selectedVariant.attributeId] = {
          id: selectedVariant.option.id,
          product_id: product.id,
          type: 'ram' as any, // Will be determined by attribute type
          name: selectedVariant.option.label,
          value: selectedVariant.option.value,
          price_adjustment: selectedVariant.option.price_modifier,
          stock_quantity: selectedVariant.option.stock_quantity,
          sku: `${product.id}-${selectedVariant.option.sku_suffix || selectedVariant.option.value}`,
        };
      }
    });

    const cartItem = {
      ...product,
      quantity,
      selected_variants: cartVariants,
      subtotal: finalPrice * quantity,
    };

    dispatch(
      addToCart({
        product: cartItem,
        quantity,
        variants: cartVariants,
      })
    );

    toast.success(`${product.name} added to cart!`);
  };

  const handleOrderNow = () => {
    // Add to cart first
    const cartVariants: { [key: string]: ProductVariant } = {};
    
    selectedVariants.forEach((selectedVariant: any) => {
      if (selectedVariant && selectedVariant.option) {
        cartVariants[selectedVariant.attributeId] = {
          id: selectedVariant.option.id,
          product_id: product.id,
          type: 'ram' as any,
          name: selectedVariant.option.label,
          value: selectedVariant.option.value,
          price_adjustment: selectedVariant.option.price_modifier,
          stock_quantity: selectedVariant.option.stock_quantity,
          sku: `${product.id}-${selectedVariant.option.sku_suffix || selectedVariant.option.value}`,
        };
      }
    });

    const cartItem = {
      ...product,
      quantity,
      selected_variants: cartVariants,
      subtotal: finalPrice * quantity,
    };

    dispatch(
      addToCart({
        product: cartItem,
        quantity,
        variants: cartVariants,
      })
    );

    // Redirect to cart page
    router.push('/cart');
    toast.success(`${product.name} added to cart! Redirecting to checkout...`);
  };

  const handleWishlist = async () => {
    try {
      const success = await toggleItem(product.id);
      if (success) {
        setIsWishlisted(!isWishlisted);
        toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
      } else {
        toast.error('Failed to update wishlist');
      }
    } catch (error) {
      console.error('Wishlist error:', error);
      toast.error('Failed to update wishlist');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.description,
          url,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    }
  };

  // Parse key features (assuming it's stored as JSON array or comma-separated string)
  const keyFeatures = product.key_features 
    ? (typeof product.key_features === 'string' 
        ? (product.key_features.includes('[') 
            ? JSON.parse(product.key_features) 
            : product.key_features.split(',').map(f => f.trim()))
        : product.key_features)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <Link href="/" className="hover:text-[#FF7A19] transition-colors">Home</Link>
          <ChevronLeft size={16} className="rotate-180" />
          <Link href="/shop" className="hover:text-[#FF7A19] transition-colors">Shop</Link>
          {product.category_name && (
            <>
              <ChevronLeft size={16} className="rotate-180" />
              <Link href={`/categories/${product.category_slug}`} className="hover:text-[#FF7A19] transition-colors">
                <span className="hidden md:inline">{product.category_name}</span>
                <span className="md:hidden truncate max-w-[12ch]">{product.category_name}</span>
              </Link>
            </>
          )}
          <ChevronLeft size={16} className="rotate-180" />
          <span className="text-gray-900 font-medium">
            <span className="hidden md:inline">{product.name}</span>
            <span className="md:hidden truncate max-w-[12ch]" title={product.name}>
              {product.name.length > 12 ? `${product.name.substring(0, 12)}...` : product.name}
            </span>
          </span>
        </div>

        {/* Product Info */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Image Gallery */}
          <div>
            <div className="relative aspect-square mb-4 bg-white rounded-xl overflow-hidden">
              <Image
                src={productImages[selectedImage] || productImages[0]}
                alt={`${product.name} - Image ${selectedImage + 1}`}
                fill
                className="object-cover"
                priority
              />
            </div>
            {productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {productImages.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index ? 'border-[#FF7A19]' : 'border-transparent'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {product.brand && (
                <Badge variant="default">
                  {product.brand}
                </Badge>
              )}
              {product.is_pre_order && (
                <span className="px-3 py-1 bg-black text-white text-xs font-semibold rounded-full">
                  PRE-ORDER
                </span>
              )}
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-4">{product.name}</h1>
            
            {/* Description right under product name */}
            {product.description && (
              <div className="text-gray-600 mb-4 line-clamp-3">
                {product.description}
              </div>
            )}
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                <Star className="fill-yellow-400 text-yellow-400" size={20} />
                <span className="font-semibold">{currentRating.toFixed(1)}</span>
                <span className="text-gray-600 text-sm">({currentReviewCount} {currentReviewCount === 1 ? 'review' : 'reviews'})</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              {/* Always show the calculated final price when variants are available */}
              {/* Price range is only shown when no variants are selected and product has variants */}
              {(product as any).price_range?.hasRange && Object.keys(selectedVariants).length === 0 ? (
                <>
                  <span className="text-2xl font-bold text-[#FF7A19]">
                    {formatCurrency((product as any).price_range.min)} - {formatCurrency((product as any).price_range.max)}
                  </span>
                  {hasDiscount && (
                    <Badge variant="error">-{discountPercentage}%</Badge>
                  )}
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-[#FF7A19]">
                    {formatCurrency(finalPrice)}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-xl text-gray-400 line-through">
                        {formatCurrency(product.original_price)}
                      </span>
                      <Badge variant="error">-{discountPercentage}%</Badge>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Key Specs - Mobile: Below prices, Desktop: Above buttons */}
            {(() => {
              // Get key specs - prioritize key_specs from admin, fallback to auto-generated from specs
              let keySpecs: Array<{ label: string; color: string }> = [];
              
              // First, check if product has key_specs (admin-defined)
              // Handle both array and string (JSONB from Supabase might be string)
              let productKeySpecs: Array<{ label: string; color: string }> | undefined = product.key_specs;
              if (productKeySpecs && typeof productKeySpecs === 'string') {
                try {
                  const parsed = JSON.parse(productKeySpecs);
                  productKeySpecs = Array.isArray(parsed) ? parsed : undefined;
                } catch (e) {
                  console.warn('Failed to parse key_specs string:', e);
                  productKeySpecs = undefined;
                }
              }
              
              if (productKeySpecs && Array.isArray(productKeySpecs) && productKeySpecs.length > 0) {
                keySpecs = productKeySpecs.slice(0, 6).map(spec => ({
                  label: spec.label || '',
                  color: spec.color || '#9333ea', // Default to purple if color missing
                }));
              } else if (product.specs && typeof product.specs === 'object') {
                // Fallback: Auto-generate from specs
                const specs = product.specs;
                if (specs.ram) {
                  const ramValue = String(specs.ram).toUpperCase();
                  keySpecs.push({
                    label: ramValue.includes('RAM') ? ramValue : `${ramValue} RAM`,
                    color: '#9333ea'
                  });
                }
                if (specs.storage) {
                  const storageValue = String(specs.storage).toUpperCase();
                  keySpecs.push({
                    label: storageValue.includes('SSD') || storageValue.includes('HDD') 
                      ? storageValue 
                      : `${storageValue} SSD`,
                    color: '#2563eb'
                  });
                }
                if (specs.processor) {
                  const processorValue = String(specs.processor).toUpperCase();
                  keySpecs.push({
                    label: processorValue,
                    color: '#0891b2'
                  });
                }
                if (specs.screen_size || specs.screen) {
                  const screenValue = String(specs.screen_size || specs.screen).toUpperCase();
                  keySpecs.push({
                    label: screenValue,
                    color: '#16a34a'
                  });
                }
              }
              
              return keySpecs.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-6 md:mb-6">
                  {keySpecs.map((spec, index) => (
                    <span
                      key={index}
                      className="text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-md whitespace-nowrap"
                      style={{ backgroundColor: spec.color }}
                    >
                      {spec.label}
                    </span>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Variant Selector */}
            <div className="mb-6">
              <ProductVariantSelector
                productId={product.id}
                basePrice={product.discount_price || product.original_price}
                onVariantChange={handleVariantChange}
              />
            </div>

            {/* Quantity & Actions */}
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-3 border border-gray-300 rounded-lg p-2 w-fit">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus size={20} />
                </button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= product.stock_quantity}
                  className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} />
                </button>
              </div>

              {/* Buttons side by side on mobile: Order Now first, then Add to Cart */}
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Zap size={20} />}
                  onClick={handleOrderNow}
                  disabled={!product.in_stock || product.stock_quantity === 0}
                  className="flex-1 bg-[#FF7A19] hover:bg-[#FF8A29]"
                >
                  Order Now
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  icon={<ShoppingCart size={20} />}
                  onClick={handleAddToCart}
                  disabled={!product.in_stock || product.stock_quantity === 0}
                  className="flex-1"
                >
                  {isInCart ? 'In Cart' : 'Add to Cart'}
                </Button>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <Button
                variant="outline"
                size="sm"
                icon={<Heart className={isWishlisted ? 'fill-red-500 text-red-500' : ''} size={18} />}
                onClick={handleWishlist}
              >
                {isWishlisted ? 'Wishlisted' : 'Wishlist'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Share2 size={18} />}
                onClick={handleShare}
              >
                Share
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="text-center">
                <Truck className="mx-auto mb-2 text-[#FF7A19]" size={24} />
                <p className="text-xs font-semibold">Free Delivery</p>
                <p className="text-xs text-gray-600">Over GH₵20,000</p>
              </div>
              <div className="text-center">
                <Shield className="mx-auto mb-2 text-[#FF7A19]" size={24} />
                <p className="text-xs font-semibold">Warranty</p>
                <p className="text-xs text-gray-600">Covered</p>
              </div>
              <div className="text-center">
                <RotateCcw className="mx-auto mb-2 text-[#FF7A19]" size={24} />
                <p className="text-xs font-semibold">Easy Returns</p>
                <p className="text-xs text-gray-600">7 Days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex gap-4 border-b border-gray-200">
            {['description', 'specs', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`pb-3 px-4 font-semibold transition-colors ${
                  activeTab === tab
                    ? 'text-[#FF7A19] border-b-2 border-[#FF7A19]'
                    : 'text-gray-600 hover:text-[#FF7A19]'
                }`}
              >
                {tab === 'specs' ? 'Specs' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === 'description' && (
              <div>
                <p className="text-gray-700 mb-6 whitespace-pre-wrap">{product.description}</p>
                {keyFeatures.length > 0 && (
                  <div>
                    <h3 className="font-bold text-lg mb-4">Key Features</h3>
                    <ul className="space-y-2">
                      {keyFeatures.map((feature: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="text-[#FF7A19] mt-1 flex-shrink-0" size={18} />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specs' && (
              <div>
                {(() => {
                  // Try to use specifications field first, fallback to specs
                  let specsData: Record<string, any> = {};
                  
                  if (product.specifications) {
                    try {
                      specsData = typeof product.specifications === 'string'
                        ? JSON.parse(product.specifications)
                        : product.specifications;
                    } catch (error) {
                      // If parsing fails, use empty object
                      specsData = {};
                    }
                  } else if (product.specs && Object.keys(product.specs).length > 0) {
                    specsData = product.specs;
                  }

                  if (Object.keys(specsData).length > 0) {
                    return (
                      <table className="w-full">
                        <tbody>
                          {Object.entries(specsData).map(([key, value]) => (
                            <tr key={key} className="border-b border-gray-200">
                              <td className="py-3 px-4 font-semibold text-gray-700 capitalize">
                                {key.replace(/_/g, ' ')}
                              </td>
                              <td className="py-3 px-4 text-gray-600">{String(value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  } else {
                    return <p className="text-gray-600">No specifications available</p>;
                  }
                })()}
              </div>
            )}

            {activeTab === 'reviews' && (
              <Reviews productId={product.id} onReviewUpdate={fetchReviewStats} />
            )}
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Similar Products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similarProducts.map((similarProduct) => (
                <ProductCard
                  key={similarProduct.id}
                  product={similarProduct}
                  onQuickView={() => setQuickViewProduct(similarProduct)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick View Modal */}
        <QuickView
          product={quickViewProduct}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      </div>
    </div>
  );
}

