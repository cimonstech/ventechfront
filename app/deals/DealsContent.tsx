'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/cards/ProductCard';
import { Button } from '@/components/ui/Button';
import { LoadGate, ProductGridSkeleton } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import { Zap, Clock, ArrowRight } from 'lucide-react';
import { getCategories } from '@/services/category.service';
import { Category } from '@/types/product';
import { FlashDeals } from '@/components/shop/FlashDeals';
import { productService } from '@/services/product.service';
import { Product } from '@/types/product';

export function DealsContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const catalog = useListQuery();

  const loadDeals = useCallback(() => {
    return catalog.run(async () => {
      const [categoriesData, dealsData] = await Promise.all([
        getCategories(),
        productService.getProducts({ limit: 20 }),
      ]);
      setCategories(categoriesData.slice(0, 8));
      setDeals(dealsData);
    });
  }, [catalog.run]);

  useEffect(() => {
    void loadDeals();
  }, [loadDeals]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#FF7A19] to-[#FF9A19] py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Zap className="text-white" size={20} />
            <span className="text-sm font-semibold text-white">HOT DEALS</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Don&apos;t Miss Out on Amazing Deals!
          </h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
            Shop the latest discounts and exclusive offers on top gadgets and electronics
          </p>
        </div>
      </section>

      {/* Flash Deals Section */}
      <section className="container mx-auto px-4 py-12">
        <FlashDeals limit={12} />
      </section>

      {/* Daily Deals */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2">Daily Deals</h2>
            <p className="text-[#3A3A3A] text-sm">Limited time offers - Shop before they&apos;re gone!</p>
          </div>
          <Link href="/shop?on_sale=true">
            <Button variant="outline" size="sm" icon={<ArrowRight size={14} />}>
              View All
            </Button>
          </Link>
        </div>

        <LoadGate
          loaded={catalog.loaded}
          loading={catalog.loading}
          updating={catalog.updating}
          error={catalog.error}
          isEmpty={deals.length === 0}
          onRetry={() => void loadDeals()}
          skeleton={<ProductGridSkeleton count={8} />}
          emptyTitle="No deals yet"
          emptyDescription="Check the shop for current prices while we add more offers."
          emptyPrimary={{ label: 'Browse all products', href: '/shop' }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {deals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </LoadGate>
      </section>

      {/* Shop Deals by Category */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2">Shop Deals by Category</h2>
              <p className="text-[#3A3A3A] text-sm">Explore deals in your favorite categories</p>
            </div>
            <Link href="/categories">
              <Button variant="outline" size="sm" icon={<ArrowRight size={14} />}>
                View All Categories
              </Button>
            </Link>
          </div>

          <LoadGate
            loaded={catalog.loaded}
            loading={catalog.loading}
            updating={catalog.updating}
            error={catalog.error}
            isEmpty={categories.length === 0}
            onRetry={() => void loadDeals()}
            skeleton={<ProductGridSkeleton count={5} />}
            emptyTitle="No categories yet"
            emptyDescription="Browse the shop while we add more product groups."
            emptyPrimary={{ label: 'Browse the shop', href: '/shop' }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}?on_sale=true`}
                  className="bg-gray-50 rounded-xl p-6 text-center hover:bg-orange-50 transition-colors group"
                >
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-200 transition-colors">
                    <Zap className="text-[#FF7A19]" size={24} />
                  </div>
                  <h3 className="font-semibold text-[#1A1A1A] group-hover:text-[#FF7A19] transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-xs text-[#3A3A3A] mt-2">View deals</p>
                </Link>
              ))}
            </div>
          </LoadGate>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-[#FF7A19] to-[#FF9A19] rounded-2xl p-8 md:p-12 text-center text-white">
          <Clock className="mx-auto mb-4" size={48} />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Never Miss a Deal</h2>
          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            Subscribe to our newsletter and be the first to know about exclusive deals, flash sales, and special offers!
          </p>
          <form className="max-w-md mx-auto flex flex-col gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-lg text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-white"
            />
            <Button variant="secondary" size="lg" type="submit" className="w-full sm:w-auto sm:mx-auto">
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
