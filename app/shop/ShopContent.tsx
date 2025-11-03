'use client';

import React, { useState, useEffect } from 'react';
import { ProductCard } from '@/components/cards/ProductCard';
import { QuickView } from '@/components/shop/QuickView';
import { Product, Category } from '@/types/product';
import { 
  SlidersHorizontal,
  Grid3x3,
  List,
  ChevronDown,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SidebarAds } from '@/components/navigation/SidebarAds';
import { productService } from '@/services/product.service';
import { getCategories } from '@/services/category.service';
import { getFilterBrands, Brand } from '@/services/brand.service';

interface ProductFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'rating';
}

export function ShopContent() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false); // For mobile only
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({
    sortBy: 'newest'
  });

  const productsPerPage = 20;

  // Fetch categories and brands for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const [categoriesData, brandsData] = await Promise.all([
          getCategories(),
          getFilterBrands()
        ]);
        setCategories(categoriesData);
        setBrands(brandsData);
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
    };
    fetchFilterData();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const offset = (currentPage - 1) * productsPerPage;
        const productsData = await productService.getProducts({
          ...filters,
          limit: productsPerPage,
          offset
        });
        
        if (currentPage === 1) {
          setProducts(productsData);
        } else {
          setProducts(prev => [...prev, ...productsData]);
        }
        
        setHasMore(productsData.length === productsPerPage);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProducts();
  }, [currentPage, filters]);

  // Update filtered products when products or filters change
  useEffect(() => {
    let filtered = [...products];
    
    // Apply client-side filters if needed
    if (filters.category) {
      filtered = filtered.filter(p => 
        p.category_id === filters.category || 
        (p.category as any)?.id === filters.category
      );
    }
    
    if (filters.brand) {
      filtered = filtered.filter(p => 
        p.brand_id === filters.brand || 
        (p.brand as any)?.id === filters.brand
      );
    }
    
    if (filters.minPrice !== undefined) {
      filtered = filtered.filter(p => {
        const price = p.discount_price || p.original_price;
        return price >= filters.minPrice!;
      });
    }
    
    if (filters.maxPrice !== undefined) {
      filtered = filtered.filter(p => {
        const price = p.discount_price || p.original_price;
        return price <= filters.maxPrice!;
      });
    }
    
    if (filters.inStock !== undefined) {
      filtered = filtered.filter(p => p.in_stock === filters.inStock);
    }
    
    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'price_asc':
            return (a.discount_price || a.original_price) - (b.discount_price || b.original_price);
          case 'price_desc':
            return (b.discount_price || b.original_price) - (a.discount_price || a.original_price);
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          case 'newest':
          default:
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
      });
    }
    
    setFilteredProducts(filtered);
  }, [products, filters]);

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const clearFilters = () => {
    setFilters({ sortBy: 'newest' });
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-3 sm:px-4 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Shop All Products</h1>
          <p className="text-gray-600">Browse our complete collection of gadgets and electronics</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Filters Sidebar - Desktop: Always visible on left, Mobile: Toggle */}
          <div className={`w-full lg:w-64 lg:flex-shrink-0 ${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-[#1A1A1A] text-lg">Filters</h3>
                <div className="flex items-center gap-2">
                  {(filters.category || filters.brand || filters.minPrice || filters.maxPrice || filters.inStock !== undefined) && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-[#FF7A19] hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setShowFilters(false)}
                    className="lg:hidden text-gray-600 hover:text-gray-900"
                    aria-label="Close filters"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

                {/* Category Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Category
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!filters.category}
                        onChange={() => handleFilterChange('category', undefined)}
                        className="w-4 h-4 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                      />
                      <span className="text-sm text-gray-700">All Categories</span>
                    </label>
                    {categories.map(category => (
                      <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.category === category.id}
                          onChange={(e) => handleFilterChange('category', e.target.checked ? category.id : undefined)}
                          className="w-4 h-4 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                        />
                        <span className="text-sm text-gray-700">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Brand Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Brand
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!filters.brand}
                        onChange={() => handleFilterChange('brand', undefined)}
                        className="w-4 h-4 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                      />
                      <span className="text-sm text-gray-700">All Brands</span>
                    </label>
                    {brands.map(brand => (
                      <label key={brand.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.brand === brand.id}
                          onChange={(e) => handleFilterChange('brand', e.target.checked ? brand.id : undefined)}
                          className="w-4 h-4 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                        />
                        <span className="text-sm text-gray-700">{brand.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice || ''}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice || ''}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    />
                  </div>
                </div>

                {/* Stock Filter */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.inStock === true}
                      onChange={(e) => handleFilterChange('inStock', e.target.checked ? true : undefined)}
                      className="w-4 h-4 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                    />
                    <span className="text-sm text-gray-700">In Stock Only</span>
                  </label>
                </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Showing {filteredProducts.length} products
                </span>
              </div>

              <div className="flex items-center gap-4">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-[#FF7A19] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Grid3x3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-[#FF7A19] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <List size={18} />
                  </button>
                </div>

                {/* Sort */}
                <select
                  value={filters.sortBy || 'newest'}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>

                {/* Filters Toggle (Mobile) - Icon Only */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden p-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                  aria-label="Toggle filters"
                >
                  <SlidersHorizontal size={18} className="text-gray-700" />
                </button>
              </div>
            </div>

            {/* Products Grid/List */}
            {isLoading && products.length === 0 ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19] mx-auto mb-4"></div>
                <p className="text-gray-600">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                <p className="text-gray-600 mb-4">No products found</p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <>
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 xl:gap-6'
                  : 'space-y-4'
                }>
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      viewMode={viewMode}
                      onQuickView={() => setQuickViewProduct(product)}
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center mt-8">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Loading...' : 'Load More'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar Ads (Desktop Only) */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <SidebarAds position="right" page="shop" />
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickView
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}
