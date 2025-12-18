'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ProductCard } from '@/components/cards/ProductCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowRight, Clock, Zap } from 'lucide-react';
import { Product } from '@/types/product';
import { FlashDeal } from '@/services/flashDeal.service';
import { getActiveFlashDeals, getFlashDealProductsList, formatTimeRemaining } from '@/services/flashDeal.service';

interface FlashDealsProps {
  limit?: number;
}

export const FlashDeals: React.FC<FlashDealsProps> = ({ limit = 8 }) => {
  const [flashDeals, setFlashDeals] = useState<FlashDeal[]>([]);
  const [flashDealProducts, setFlashDealProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('00:00:00');

  useEffect(() => {
    fetchFlashDeals();
  }, []);

  // Update countdown every second
  useEffect(() => {
    if (flashDeals.length > 0) {
      const interval = setInterval(() => {
        const time = formatTimeRemaining(flashDeals[0].end_time);
        setTimeRemaining(time);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [flashDeals]);

  const fetchFlashDeals = async () => {
    try {
      setIsLoading(true);
      const [deals, products] = await Promise.all([
        getActiveFlashDeals(),
        getFlashDealProductsList()
      ]);
      
      setFlashDeals(deals);
      setFlashDealProducts(products.slice(0, limit));
    } catch (error) {
      // Silently handle errors - service already handles them gracefully
      // Only log unexpected errors
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String((error as any).message || '');
        if (!errorMessage.includes('relation') && !errorMessage.includes('does not exist')) {
          console.warn('Unexpected error in FlashDeals component:', error);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <section className="bg-gradient-to-r from-[#FF7A19] to-[#FF9A19] py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="text-white" size={28} />
              <div>
                <h2 className="text-xl font-bold text-white">Flash Deals</h2>
                <p className="text-white/90 text-xs">Loading deals...</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-48 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (flashDeals.length === 0 || flashDealProducts.length === 0) {
    return null; // Don't show section if no active flash deals
  }

  return (
    <section className="bg-gradient-to-r from-[#FF7A19] to-[#FF9A19] py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Zap className="text-white" size={28} />
            <div>
              <h2 className="text-xl font-bold text-white">Flash Deals</h2>
              <p className="text-white/90 text-xs">Limited time offers</p>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
            <div className="flex items-center gap-2 text-white">
              <Clock size={16} />
              <span className="font-bold text-sm">Ends in: {timeRemaining}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4">
          {flashDealProducts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#3A3A3A] text-sm">No flash deals available at the moment</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {flashDealProducts.map((product) => (
                  <div key={product.id} className="relative">
                    <ProductCard product={product} />
                    <div className="absolute -top-2 -right-2 z-10">
                      <Badge variant="error" size="sm">
                        {(product as any).flash_deal_discount || 0}% OFF
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-6">
                <Link href="/deals">
                  <Button variant="outline" size="md" icon={<ArrowRight size={16} />}>
                    View All Flash Deals
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

