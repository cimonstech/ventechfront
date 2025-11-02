'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HeroSlider } from '@/components/banners/HeroSlider';
import { ProductCard } from '@/components/cards/ProductCard';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { ProductListSkeleton } from '@/components/loaders/ProductCardSkeleton';
import { QuickView } from '@/components/shop/QuickView';
import { FlashDeals } from '@/components/shop/FlashDeals';
import { Button } from '@/components/ui/Button';
import { 
  ArrowRight, 
  ShoppingBag, 
  Truck, 
  Shield, 
  Headphones,
  Zap,
  Award,
  Tag,
  TrendingUp,
  Smartphone,
  Laptop,
  Watch,
  Star
} from 'lucide-react';
import { Product, Category } from '@/types/product';
import { Banner } from '@/types/banner';
import { productService } from '@/services/product.service';
import { getCategories } from '@/services/category.service';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [heroBanners, setHeroBanners] = useState<Banner[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Fetch banners separately to allow refresh
  const fetchBanners = useCallback(async () => {
    try {
      const { data: bannersData, error } = await supabase
        .from('banners')
        .select('*')
        .eq('active', true)
        .order('order', { ascending: true })
        .limit(10);
      
      if (error) {
        console.error('Error fetching banners:', error);
        return;
      }
      
      if (bannersData) {
        // Filter for hero type banners (if type field exists) and map to expected format
        const heroBanners = bannersData
          .filter((b: any) => !b.type || b.type === 'hero')
          .map((b: any) => ({
            id: b.id,
            title: b.title || '',
            subtitle: b.subtitle || '',
            description: b.description || '',
            image_url: b.image_url || '',
            link_url: b.link_url || b.link || '',
            link_text: b.button_text || b.link_text || 'Shop Now',
            display_order: b.order || b.sort_order || b.display_order || 0,
            active: b.active !== false,
          }))
          .sort((a: any, b: any) => a.display_order - b.display_order);
        
        setHeroBanners(heroBanners);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    }
  }, []);

  // Fetch real data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch categories
        const categoriesData = await getCategories();
        setCategories(categoriesData);
        
        // Fetch products
        const productsData = await productService.getProducts();
        setFeaturedProducts(productsData);
        
        // Fetch banners
        await fetchBanners();
      } catch (error) {
        console.error('Error fetching homepage data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Set up interval to refresh banners every 30 seconds (for admin updates)
    const bannerRefreshInterval = setInterval(() => {
      fetchBanners();
    }, 30000);
    
    return () => {
      clearInterval(bannerRefreshInterval);
    };
  }, [fetchBanners]);

  return (
    <div className="bg-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <HeroSlider banners={heroBanners} />
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-6 sm:py-8 border-y border-gray-200">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                <Truck className="text-[#FF7A19]" size={24} />
              </div>
              <h3 className="font-semibold text-sm text-[#1A1A1A] mb-1">Fast Delivery</h3>
              <p className="text-[#3A3A3A] text-xs">Quick & safe shipping</p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                <Shield className="text-[#FF7A19]" size={24} />
              </div>
              <h3 className="font-semibold text-sm text-[#1A1A1A] mb-1">Secure Payment</h3>
              <p className="text-[#3A3A3A] text-xs">100% secure checkout</p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                <Award className="text-[#FF7A19]" size={24} />
              </div>
              <h3 className="font-semibold text-sm text-[#1A1A1A] mb-1">Quality Guarantee</h3>
              <p className="text-[#3A3A3A] text-xs">100% original products</p>
            </div>

            <div className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                <Headphones className="text-[#FF7A19]" size={24} />
              </div>
              <h3 className="font-semibold text-sm text-[#1A1A1A] mb-1">24/7 Support</h3>
              <p className="text-[#3A3A3A] text-xs">Always here to help</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Categories */}
      <section className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <Link href="/categories/smartphones">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
              <Smartphone className="text-[#FF7A19] mx-auto mb-2" size={32} />
              <h3 className="font-semibold text-sm text-[#1A1A1A]">Smartphones</h3>
              <p className="text-xs text-[#3A3A3A] mt-1">Latest models</p>
            </div>
          </Link>
          <Link href="/categories/laptops">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
              <Laptop className="text-[#1A1A1A] mx-auto mb-2" size={32} />
              <h3 className="font-semibold text-sm text-[#1A1A1A]">Laptops</h3>
              <p className="text-xs text-[#3A3A3A] mt-1">Work & Gaming</p>
            </div>
          </Link>
          <Link href="/categories/smartwatches">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
              <Watch className="text-[#FF7A19] mx-auto mb-2" size={32} />
              <h3 className="font-semibold text-sm text-[#1A1A1A]">Smartwatches</h3>
              <p className="text-xs text-[#3A3A3A] mt-1">Fitness trackers</p>
            </div>
          </Link>
          <Link href="/categories">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 text-center hover:shadow-lg transition-shadow cursor-pointer">
              <ShoppingBag className="text-[#1A1A1A] mx-auto mb-2" size={32} />
              <h3 className="font-semibold text-sm text-[#1A1A1A]">All Categories</h3>
              <p className="text-xs text-[#3A3A3A] mt-1">Browse all</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Flash Deals Section */}
      <FlashDeals limit={8} />


      {/* Featured Products Section */}
      <section className="bg-gray-50 py-6 sm:py-10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="text-[#FF7A19] fill-[#FF7A19]" size={20} />
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1A1A1A]">Featured Products</h2>
              </div>
              <p className="text-[#3A3A3A] text-[11px] sm:text-xs">Handpicked for you</p>
            </div>
            <Link href="/products" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" icon={<ArrowRight size={14} />} className="w-full sm:w-auto">
                View All
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <ProductListSkeleton count={5} />
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-[#3A3A3A] text-sm mb-4">No featured products available</p>
              <Link href="/categories">
                <Button variant="primary" size="sm">
                  Browse Categories
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4">
              {featuredProducts.slice(0, 5).map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onQuickView={() => setQuickViewProduct(product)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* All Products / Trending */}
      <section className="container mx-auto px-3 sm:px-4 py-6 sm:py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="text-[#FF7A19]" size={20} />
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#1A1A1A]">All Products</h2>
              </div>
              <p className="text-[#3A3A3A] text-[11px] sm:text-xs">Explore our complete collection</p>
            </div>
            <Link href="/shop" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" icon={<ArrowRight size={14} />} className="w-full sm:w-auto">
                View All
              </Button>
            </Link>
          </div>

        {isLoading ? (
          <ProductListSkeleton count={20} />
        ) : featuredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-[#3A3A3A] text-sm mb-4">No products available yet</p>
            <Link href="/shop">
              <Button variant="primary" size="sm">
                Browse Shop
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {featuredProducts.slice(0, 20).map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onQuickView={() => setQuickViewProduct(product)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Special Offers Banner */}
      <section className="container mx-auto px-4 py-10">
        <div className="relative rounded-2xl overflow-hidden text-white">
          <div className="absolute inset-0 bg-[url('/placeholder/bg-gadgets1.webp')] bg-cover bg-center" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 max-w-2xl p-8 md:p-12">
            <div className="inline-flex items-center gap-2 bg-[#FF7A19] rounded-full px-4 py-1 mb-4">
              <Tag size={14} />
              <span className="text-xs font-semibold">SPECIAL OFFER</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-white">
              Get Up to 50% OFF on Selected Items
            </h2>
            <p className="text-white/90 text-sm mb-6">
              Don't miss out on our biggest sale of the season. Limited time only!
            </p>
            <Link href="/deals">
              <Button variant="primary" size="lg" icon={<ArrowRight size={16} />}>
                Shop Now
              </Button>
            </Link>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10">
            <ShoppingBag size={200} />
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-gray-50 py-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">Why Choose VENTECH?</h2>
            <p className="text-[#3A3A3A] text-sm">Your trusted tech partner in Ghana</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="text-[#FF7A19]" size={28} />
              </div>
              <h3 className="font-bold text-[#1A1A1A] mb-2">Authentic Products</h3>
              <p className="text-[#3A3A3A] text-xs leading-relaxed">
                We guarantee 100% genuine products from authorized dealers. No fakes, ever.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="text-[#FF7A19]" size={28} />
              </div>
              <h3 className="font-bold text-[#1A1A1A] mb-2">Lightning Fast</h3>
              <p className="text-[#3A3A3A] text-xs leading-relaxed">
                Order today, get it tomorrow. We deliver across Ghana with express options.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-[#FF7A19]" size={28} />
              </div>
              <h3 className="font-bold text-[#1A1A1A] mb-2">Warranty Protected</h3>
              <p className="text-[#3A3A3A] text-xs leading-relaxed">
                All products come with manufacturer warranty and our 30-day return guarantee.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="container mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-[#FF7A19] to-[#FF9A19] rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Stay Updated</h2>
          <p className="text-white/90 text-sm mb-6">Subscribe to get special offers and updates</p>
          <div className="max-w-md mx-auto flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              suppressHydrationWarning
              className="flex-1 px-4 py-2 rounded-lg bg-transparent border border-white text-white placeholder:white/80 text-sm focus:outline-none focus:ring-2 focus:ring-white"
            />
            <Button variant="secondary" size="md">
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-[#1A1A1A] py-12">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Ready to Upgrade Your Tech?
          </h2>
          <p className="text-base text-white/80 mb-6">
            Explore our collection of the latest gadgets and electronics
          </p>
          <Link href="/categories">
            <Button variant="primary" size="lg" icon={<ShoppingBag size={18} />}>
              Start Shopping
            </Button>
          </Link>
        </div>
      </section>

      {/* Quick View Modal */}
      <QuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}
