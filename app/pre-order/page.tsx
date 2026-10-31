'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PreOrderProductCard } from '@/components/cards/PreOrderProductCard';
import { LoadGate, ProductGridSkeleton } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import { getPreOrderProducts, PreOrderProduct } from '@/services/preOrder.service';
import { Package, Clock, Lock, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function PreOrderPage() {
  const [products, setProducts] = useState<PreOrderProduct[]>([]);
  const catalog = useListQuery();

  const fetchPreOrderProducts = async () => {
    await catalog.run(async () => {
      setProducts(await getPreOrderProducts());
    });
  };

  useEffect(() => {
    void fetchPreOrderProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-[#FF7A19] via-[#FF8C3A] to-[#D2691E] text-white py-20 md:py-28 overflow-hidden">
        {/* Background Image Overlay - More Visible */}
        <div className="absolute inset-0">
          <Image
            src="/banners/store2-slider-bg3.webp"
            alt="Pre-Order Background"
            fill
            className="object-cover opacity-30"
            priority
            sizes="100vw"
          />
          {/* Gradient Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF7A19]/90 via-[#FF8C3A]/85 to-[#D2691E]/90"></div>
        </div>
        {/* Texture Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Icon - White Outline */}
            <div className="w-20 h-20 md:w-24 md:h-24 border-2 border-white rounded-lg flex items-center justify-center mx-auto mb-6 bg-white/10 backdrop-blur-sm">
              <Package className="w-10 h-10 md:w-12 md:h-12 text-white" strokeWidth={2} />
            </div>
            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
              Pre-Order Elite Tech
            </h1>
            {/* Description */}
            <p className="text-lg md:text-xl text-white/95 mb-8 leading-relaxed drop-shadow-md">
              Get first access. Secure great gadgets before they arrive at supplier prices.
            </p>
            {/* CTA Button */}
            <Link href="#products">
              <Button
                variant="primary"
                size="lg"
                className="bg-gradient-to-r from-[#FF7A19] to-[#FFB84D] hover:from-[#FF8C3A] hover:to-[#FFC966] text-white font-bold px-10 py-5 text-lg rounded-full shadow-2xl transform hover:scale-105 transition-transform"
              >
                Browse Pre-Orders
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Reserve Early Section - White Card Overlay */}
      <section className="bg-white -mt-10 md:-mt-16 relative z-20 rounded-t-3xl shadow-2xl">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] text-center mb-8 md:mb-12">
            Why Reserve Early?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto mb-8">
            {/* Early Access */}
            <div className="flex items-start gap-4 p-4 md:p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="text-[#FF7A19] w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base md:text-lg font-bold text-[#1A1A1A] mb-2">Early Access</h3>
                <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                  Get exclusive access to upcoming gadgets before public release.
                </p>
              </div>
            </div>

            {/* Guaranteed Reservation */}
            <div className="flex items-start gap-4 p-4 md:p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-orange-100 rounded-full flex items-center justify-center">
                <Lock className="text-[#FF7A19] w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base md:text-lg font-bold text-[#1A1A1A] mb-2">Guaranteed Reservation</h3>
                <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                  Your device is secured once you pre-order—no competition, no stress.
                </p>
              </div>
            </div>

            {/* Priority Delivery */}
            <div className="flex items-start gap-4 p-4 md:p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-orange-100 rounded-full flex items-center justify-center">
                <Truck className="text-[#FF7A19] w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-base md:text-lg font-bold text-[#1A1A1A] mb-2">Priority Delivery</h3>
                <p className="text-sm md:text-base text-[#3A3A3A] leading-relaxed">
                  Pre-orders are shipped first as soon as stock arrives.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-base md:text-lg text-[#3A3A3A] font-medium">
            Secure your device early. Save big with supplier prices.
          </p>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-12 md:py-16" style={{ backgroundColor: '#000000' }}>
        <div className="container mx-auto px-4">
          <h2 className="pre-order-section-title text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12" style={{ color: '#ffffff' }}>
            Available for Pre-Order
          </h2>

          <LoadGate
            loaded={catalog.loaded}
            loading={catalog.loading}
            updating={catalog.updating}
            error={catalog.error}
            isEmpty={products.length === 0}
            onRetry={() => void fetchPreOrderProducts()}
            skeleton={<ProductGridSkeleton count={8} />}
            emptyTitle="No pre-order products yet"
            emptyDescription="Check back soon, or browse the shop for items that are in stock now."
            emptyPrimary={{ label: 'Browse the shop', href: '/shop' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <PreOrderProductCard key={product.id} product={product} />
              ))}
            </div>
          </LoadGate>
        </div>
      </section>
    </div>
  );
}

