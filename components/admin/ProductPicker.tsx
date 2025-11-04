'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface ProductPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: { id: string; name: string; slug: string; image_url?: string }) => void;
}

export function ProductPicker({ isOpen, onClose, onSelect }: ProductPickerProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Try fetching via product service first (uses backend API)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const response = await fetch(`${apiUrl}/api/products?limit=100`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              setProducts(result.data.map((p: any) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                thumbnail: p.thumbnail,
                images: p.images || [],
                original_price: p.original_price || p.price,
                discount_price: p.discount_price,
              })));
              return;
            }
          }
        }
      } catch (apiError) {
        console.log('API fetch failed, trying direct Supabase query...');
      }
      
      // Fallback to direct Supabase query
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, thumbnail, images, original_price, discount_price')
        .order('name')
        .limit(100);

      if (error) {
        // Log full error details for debugging
        console.error('Supabase error fetching products:', {
          error,
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        
        // Check for table doesn't exist or RLS policy errors
        const errorMessage = error.message || JSON.stringify(error) || '';
        const errorCode = error.code || '';
        
        // Check if it's a "table doesn't exist" error
        const isTableNotFound = 
          errorCode === '42P01' || 
          errorCode === 'PGRST116' || 
          errorMessage.includes('does not exist') || 
          errorMessage.includes('relation') || 
          errorMessage.includes('not found');
        
        // Check if it's an RLS policy error
        const isRLSError = 
          errorMessage.includes('policy') ||
          errorMessage.includes('RLS') ||
          errorMessage.includes('permission denied') ||
          errorMessage.includes('new row violates row-level security');
        
        if (isTableNotFound || isRLSError) {
          // Silently handle - these are expected in some cases
          setProducts([]);
          toast.error('Unable to load products. Please check your permissions.');
          return;
        }
        
        throw error;
      }
      
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      const errorMessage = error?.message || error?.error_description || 'Failed to load products';
      toast.error(errorMessage);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (product: any) => {
    setSelectedProduct(product);
  };

  const handleConfirm = () => {
    if (selectedProduct) {
      onSelect({
        id: selectedProduct.id,
        name: selectedProduct.name,
        slug: selectedProduct.slug,
        image_url: selectedProduct.thumbnail || selectedProduct.images?.[0] || '',
      });
      onClose();
      setSelectedProduct(null);
      setSearchQuery('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1A1A1A]">Select Product</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
              />
            </div>
          </div>

          {/* Products List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-[#FF7A19]" size={32} />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-[#3A3A3A]">
              No products found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedProduct?.id === product.id
                      ? 'border-[#FF7A19] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {product.thumbnail || product.images?.[0] ? (
                        <Image
                          src={product.thumbnail || product.images[0]}
                          alt={product.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1A1A1A] truncate">{product.name}</h3>
                      <p className="text-sm text-[#3A3A3A] truncate">{product.slug}</p>
                      <p className="text-sm font-medium text-[#FF7A19] mt-1">
                        GHS {product.discount_price || product.original_price || 0}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleConfirm}
            disabled={!selectedProduct}
          >
            Select Product
          </Button>
        </div>
      </div>
    </div>
  );
}

