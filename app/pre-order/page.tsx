'use client';

import React, { useState, useEffect } from 'react';
import { Metadata } from 'next';
import CheckmarkLoader from '@/components/loaders/CheckmarkLoader';
import { PreOrderProductCard } from '@/components/cards/PreOrderProductCard';
import { getPreOrderProducts, PreOrderProduct } from '@/services/preOrder.service';
import { Package, Clock } from 'lucide-react';

export default function PreOrderPage() {
  const [products, setProducts] = useState<PreOrderProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreOrderProducts();
  }, []);

  const fetchPreOrderProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPreOrderProducts();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching pre-order products:', err);
      setError('Failed to load pre-order products. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#FF7A19] to-[#FF9A19] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Package className="w-10 h-10" />
            <h1 className="text-4xl font-bold">Pre-Order Now</h1>
          </div>
          <p className="text-lg text-white/90 max-w-2xl">
            Reserve the latest devices before they arrive! Browse our pre-order collection and secure your favorite gadgets with flexible shipping options.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200 py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Pre-Order Information
              </p>
              <p className="text-sm text-blue-700">
                Pre-orders require full payment upfront. Estimated delivery dates are provided for each shipping option. 
                You'll receive updates as your order is processed and shipped.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <CheckmarkLoader size={72} color="#FF7A19" speedMs={600} />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Pre-Order Products Available
            </h2>
            <p className="text-gray-600 mb-6">
              Check back soon for new pre-order opportunities!
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Available for Pre-Order ({products.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <PreOrderProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

