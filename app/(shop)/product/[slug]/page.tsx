'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProductCard } from '@/components/cards/ProductCard';
import { QuickView } from '@/components/shop/QuickView';
import { Reviews } from '@/components/product/Reviews';
import { similarProductsService } from '@/services/similarProducts.service';
import { getProductBySlug } from '@/services/product.service';
import { supabase } from '@/lib/supabase';
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
  ChevronRight,
  Package,
  CreditCard,
  Headphones,
  ShoppingCart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Product, ProductVariant } from '@/types/product';
import { ProductVariantSelector } from '@/components/product/ProductVariantSelector';

export default function ProductDetailPage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((state) => state.cart);
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, any>>({});
  const [variantPrice, setVariantPrice] = useState<number>(0);
  const [actualReviewCount, setActualReviewCount] = useState<number>(0);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(true);
  
  // Check if product is in cart
  const isInCart = product ? items.some(item => item.id === product.id) : false;

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.slug) return;
      
      setIsLoading(true);
      try {
        const productData = await getProductBySlug(params.slug as string);
        if (productData) {
          setProduct(productData);
        } else {
          // Product not found
          console.error('Product not found');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [params.slug]);


  // Fetch actual review count
  useEffect(() => {
    if (!product) return;
    
    const fetchReviewCount = async () => {
      try {
        const { count, error } = await supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id)
          .eq('is_approved', true);
        
        if (!error && count !== null && count !== undefined) {
          setActualReviewCount(count);
        }
      } catch (error) {
        // Silently fail - use product.review_count as fallback
        console.error('Error fetching review count:', error);
      }
    };

    fetchReviewCount();
  }, [product?.id]);

  // Fetch similar products
  useEffect(() => {
    if (!product) return;
    
    const fetchSimilarProducts = async () => {
      setIsLoadingSimilar(true);
      try {
        const similar = await similarProductsService.getSimilarProducts(
          product.id,
          product.category_id || '',
          product.brand_id || '',
          4
        );
        setSimilarProducts(similar);
      } catch (error) {
        console.error('Error fetching similar products:', error);
      } finally {
        setIsLoadingSimilar(false);
      }
    };

    fetchSimilarProducts();
  }, [product?.id, product?.category_id, product?.brand_id]);

  const handleAddToCart = () => {
    if (!product) return;
    
    // If product has variants but none selected, show error
    if (product.price_range?.hasRange && Object.keys(selectedVariants).length === 0) {
      toast.error('Please select product options');
      return;
    }
    
    // Calculate final price
    const finalPrice = variantPrice > 0 
      ? variantPrice 
      : (product.discount_price || product.original_price);
    
    const cartItem = {
      ...product,
      quantity: quantity,
      selected_variants: selectedVariants,
      subtotal: finalPrice,
    };

    dispatch(
      addToCart({
        product: cartItem,
        quantity: quantity,
      })
    );

    toast.success(`${product.name} added to cart!`);
  };

  const handleWishlistToggle = () => {
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const handleShare = () => {
    if (!product) return;
    
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const calculateTotalPrice = () => {
    if (!product) return 0;
    
    // If variant price is calculated, use it
    if (variantPrice > 0) {
      return variantPrice * quantity;
    }
    
    // Otherwise use base price
    const basePrice = product.discount_price || product.original_price;
    return basePrice * quantity;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  // Product not found
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
          <p className="text-gray-600 mb-4">The product you're looking for doesn't exist.</p>
          <Link href="/shop">
            <Button variant="primary">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-[#3A3A3A]">
              <Link href="/" className="hover:text-[#FF7A19]">Home</Link>
              <ChevronRight size={16} />
              <Link href="/shop" className="hover:text-[#FF7A19]">Shop</Link>
              <ChevronRight size={16} />
              <Link href={`/shop?category=${product.category_slug || product.category_id}`} className="hover:text-[#FF7A19]">
                {product.category_name || 'Category'}
              </Link>
              <ChevronRight size={16} />
              <span className="text-[#1A1A1A] font-medium">
                {product.name.length > 12 ? `${product.name.substring(0, 12)}...` : product.name}
              </span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Product Images */}
            <div>
              <div className="bg-white rounded-xl overflow-hidden mb-4">
                <div className="relative aspect-square">
                  <Image
                    src={product.images[selectedImage]}
                    alt={product.name}
                    fill
                    className="object-contain p-8"
                  />
                  {product.discount_price && product.discount_price < product.original_price && (
                    <Badge variant="error" className="absolute top-4 left-4 text-sm">
                      -{Math.round(((product.original_price - product.discount_price) / product.original_price) * 100)}%
                    </Badge>
                  )}
                  {!product.in_stock && (
                    <Badge variant="default" className="absolute top-4 left-4">
                      Out of Stock
                    </Badge>
                  )}
                </div>
              </div>

              {/* Thumbnail Images */}
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`
                      relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                      ${selectedImage === index ? 'border-[#FF7A19]' : 'border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-contain p-2"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div>
              <div className="bg-white rounded-xl p-6">
                <div className="mb-4">
                  <p className="text-xs sm:text-sm text-[#FF7A19] font-semibold mb-2">{product.brand}</p>
                  <h1 className="text-base sm:text-xl md:text-2xl font-bold text-[#1A1A1A] mb-3">{product.name}</h1>
                  
                  {/* Rating */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                    <span className="text-xs sm:text-sm text-[#3A3A3A]">
                      {product.rating.toFixed(1)} ({actualReviewCount > 0 ? actualReviewCount : (product.review_count || 0)} reviews)
                    </span>
                  </div>

                  {/* Price - Show range if variants exist, otherwise calculated price */}
                  <div className="flex items-baseline gap-2 sm:gap-3 mb-6 flex-wrap">
                    {product.price_range?.hasRange ? (
                      variantPrice > 0 ? (
                        <>
                          <span className="text-lg sm:text-xl font-bold text-[#FF7A19]">
                            GHS {(variantPrice * quantity).toLocaleString()}
                          </span>
                          <span className="text-sm sm:text-base text-gray-500">
                            (Range: GHS {product.price_range.min.toLocaleString()} - GHS {product.price_range.max.toLocaleString()})
                          </span>
                        </>
                      ) : (
                        <span className="text-lg sm:text-xl font-bold text-[#FF7A19]">
                          GHS {product.price_range.min.toLocaleString()} - GHS {product.price_range.max.toLocaleString()}
                        </span>
                      )
                    ) : (
                      <>
                        <span className="text-lg sm:text-xl font-bold text-[#FF7A19]">
                          GHS {calculateTotalPrice().toLocaleString()}
                        </span>
                        {product.discount_price && product.discount_price < product.original_price && (
                          <span className="text-sm sm:text-base text-gray-400 line-through">
                            GHS {(product.original_price * quantity).toLocaleString()}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className="flex items-center gap-2 mb-6">
                    {product.in_stock ? (
                      <>
                        <Check className="text-green-600" size={20} />
                        <span className="text-sm text-green-600 font-semibold">
                          In Stock ({product.stock_quantity} available)
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-red-600 font-semibold">Out of Stock</span>
                    )}
                  </div>
                </div>

                {/* Variant Selector */}
                {product.price_range?.hasRange && (
                  <div className="mb-6">
                    <ProductVariantSelector
                      productId={product.id}
                      basePrice={product.discount_price || product.original_price}
                      onVariantChange={(variants, totalPrice) => {
                        setSelectedVariants(variants);
                        setVariantPrice(totalPrice);
                      }}
                    />
                  </div>
                )}

                {/* Quantity */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">Quantity</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border-2 border-gray-200 rounded-lg">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="p-2 hover:bg-gray-100 transition-colors"
                        disabled={quantity <= 1}
                      >
                        <Minus size={18} />
                      </button>
                      <span className="px-6 py-2 font-semibold text-[#1A1A1A] min-w-[60px] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock_quantity || 99, quantity + 1))}
                        className="p-2 hover:bg-gray-100 transition-colors"
                        disabled={quantity >= (product.stock_quantity || 99)}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <span className="text-sm text-[#3A3A3A]">
                      Max: {product.stock_quantity || 99}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 sm:gap-3 mb-6 items-center">
                  {/* Add to Cart Button - Full width on all devices */}
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex flex-1"
                    onClick={handleAddToCart}
                    disabled={!product.in_stock}
                  >
                    {isInCart ? 'In Cart' : 'Add to Cart'}
                  </Button>
                  
                  {/* Wishlist Icon - Reduced padding */}
                  <button
                    onClick={handleWishlistToggle}
                    className={`p-1.5 sm:p-2 border-2 rounded-lg transition-colors ${
                      isWishlisted 
                        ? 'border-red-500 text-red-500 bg-red-50' 
                        : 'border-gray-200 text-gray-600 hover:border-[#FF7A19] hover:text-[#FF7A19]'
                    }`}
                    title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart size={16} className={isWishlisted ? 'fill-red-500' : ''} />
                  </button>
                  
                  {/* Share Icon - Reduced padding */}
                  <button
                    onClick={handleShare}
                    className="p-1.5 sm:p-2 border-2 border-gray-200 rounded-lg text-gray-600 hover:border-[#FF7A19] hover:text-[#FF7A19] transition-colors"
                    title="Share product"
                  >
                    <Share2 size={16} />
                  </button>
                </div>

                {/* Features */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-bold text-[#1A1A1A] mb-3">Key Features</h3>
                  <ul className="space-y-2">
                    {(product.specs && typeof product.specs === 'object' ? Object.entries(product.specs).slice(0, 6) : []).map(([key, value], index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="text-[#FF7A19] flex-shrink-0 mt-0.5" size={16} />
                        <span className="text-sm text-[#3A3A3A]">{key}: {String(value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white rounded-lg p-4 text-center">
                  <Truck className="text-[#FF7A19] mx-auto mb-2" size={24} />
                  <p className="text-xs font-semibold text-[#1A1A1A]">Free Delivery</p>
                  <p className="text-xs text-[#3A3A3A]">Orders over GHS 500</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <Shield className="text-[#FF7A19] mx-auto mb-2" size={24} />
                  <p className="text-xs font-semibold text-[#1A1A1A]">Warranty</p>
                  <p className="text-xs text-[#3A3A3A]">1 Year Coverage</p>
                </div>
                <div className="bg-white rounded-lg p-4 text-center">
                  <RotateCcw className="text-[#FF7A19] mx-auto mb-2" size={24} />
                  <p className="text-xs font-semibold text-[#1A1A1A]">Easy Returns</p>
                  <p className="text-xs text-[#3A3A3A]">7-Day Policy</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="bg-white rounded-xl overflow-hidden mb-12">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('description')}
                className={`
                  flex-1 py-4 px-6 font-semibold text-sm transition-colors
                  ${activeTab === 'description'
                    ? 'text-[#FF7A19] border-b-2 border-[#FF7A19]'
                    : 'text-[#3A3A3A] hover:text-[#1A1A1A]'
                  }
                `}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('specs')}
                className={`
                  flex-1 py-4 px-6 font-semibold text-sm transition-colors
                  ${activeTab === 'specs'
                    ? 'text-[#FF7A19] border-b-2 border-[#FF7A19]'
                    : 'text-[#3A3A3A] hover:text-[#1A1A1A]'
                  }
                `}
              >
                Specs
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`
                  flex-1 py-4 px-6 font-semibold text-sm transition-colors
                  ${activeTab === 'reviews'
                    ? 'text-[#FF7A19] border-b-2 border-[#FF7A19]'
                    : 'text-[#3A3A3A] hover:text-[#1A1A1A]'
                  }
                `}
              >
                Reviews ({actualReviewCount > 0 ? actualReviewCount : (product.review_count || 0)})
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'description' && (
                <div className="prose max-w-none">
                  <p className="text-[#3A3A3A] leading-relaxed">{product.description}</p>
                  {product.specs && typeof product.specs === 'object' && Object.keys(product.specs).length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-lg font-bold text-[#1A1A1A] mb-4">Product Specs</h4>
                      <ul className="grid md:grid-cols-2 gap-3">
                        {Object.entries(product.specs).map(([key, value], index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="text-[#FF7A19] flex-shrink-0 mt-0.5" size={18} />
                            <span className="text-sm text-[#3A3A3A]">{key}: {String(value)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'specs' && product.specs && typeof product.specs === 'object' && (
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex border-b border-gray-100 pb-3">
                      <span className="font-semibold text-sm text-[#1A1A1A] w-1/3">{key}</span>
                      <span className="text-sm text-[#3A3A3A] w-2/3">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'reviews' && (
                <Reviews productId={product.id} />
              )}
            </div>
          </div>

          {/* Similar Products */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#1A1A1A]">Similar Products</h2>
              <Link href="/shop" className="text-sm text-[#FF7A19] hover:underline font-semibold">
                View All
              </Link>
            </div>
            
            {isLoadingSimilar ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 aspect-square rounded-xl mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : similarProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {similarProducts.slice(0, 4).map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    onQuickView={() => setQuickViewProduct(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[#3A3A3A]">No similar products found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickView
          product={quickViewProduct}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </>
  );
}
