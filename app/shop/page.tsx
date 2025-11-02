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

export default function ShopPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    priceRange: [0, 10000],
    brands: [] as string[],
    categories: [] as string[],
    inStock: false,
    sort: 'featured',
  });

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [productsData, categoriesData, brandsData] = await Promise.all([
          productService.getProducts({ limit: 100 }),
          getCategories(),
          getFilterBrands()
        ]);
        console.log('Fetched data:', { 
          products: productsData.length, 
          categories: categoriesData.length, 
          brands: brandsData.length,
          categoriesData: categoriesData,
          brandsData: brandsData
        });
        
        // Additional debugging
        console.log('Categories details:', categoriesData.map(c => ({ id: c.id, name: c.name, slug: c.slug })));
        console.log('Brands details:', brandsData.map(b => ({ id: b.id, name: b.name, slug: b.slug })));
        setProducts(productsData);
        setFilteredProducts(productsData.slice(0, 20)); // First 20 products
        setCategories(categoriesData);
        setBrands(brandsData);
      } catch (error) {
        console.error('Error fetching shop data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products];

    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(product => 
        filters.categories.includes(product.category_id)
      );
    }

    // Apply brand filter
    if (filters.brands.length > 0) {
      filtered = filtered.filter(product => 
        product.brand_id && filters.brands.includes(product.brand_id)
      );
    }

    // Apply price filter
    filtered = filtered.filter(product => {
      const price = product.discount_price || product.original_price;
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Apply stock filter
    if (filters.inStock) {
      filtered = filtered.filter(product => product.stock_quantity > 0);
    }

    // Apply sorting
    switch (filters.sort) {
      case 'price-low':
        filtered.sort((a, b) => (a.discount_price || a.original_price) - (b.discount_price || b.original_price));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.discount_price || b.original_price) - (a.discount_price || a.original_price));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
        break;
      default: // featured
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    setFilteredProducts(filtered.slice(0, 20));
    setCurrentPage(1);
    setHasMore(filtered.length > 20);
  }, [products, filters]);

  // Load more products
  const loadMore = () => {
    const nextPage = currentPage + 1;
    const startIndex = 0;
    const endIndex = nextPage * 20;
    
    let filtered = [...products];

    // Apply same filters as above
    if (filters.categories.length > 0) {
      filtered = filtered.filter(product => 
        filters.categories.includes(product.category_id)
      );
    }
    if (filters.brands.length > 0) {
      filtered = filtered.filter(product => 
        product.brand_id && filters.brands.includes(product.brand_id)
      );
    }
    filtered = filtered.filter(product => {
      const price = product.discount_price || product.original_price;
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });
    if (filters.inStock) {
      filtered = filtered.filter(product => product.stock_quantity > 0);
    }

    // Apply sorting
    switch (filters.sort) {
      case 'price-low':
        filtered.sort((a, b) => (a.discount_price || a.original_price) - (b.discount_price || b.original_price));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.discount_price || b.original_price) - (a.discount_price || a.original_price));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
        break;
      default:
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    setFilteredProducts(filtered.slice(0, endIndex));
    setCurrentPage(nextPage);
    setHasMore(endIndex < filtered.length);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      priceRange: [0, 10000],
      brands: [],
      categories: [],
      inStock: false,
      sort: 'featured',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] whitespace-nowrap">Shop All Products</h1>
                <p className="text-xs text-[#3A3A3A] mt-1">Showing {filteredProducts.length} results</p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="hidden md:flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#FF7A19] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Grid3x3 size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#FF7A19] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <List size={18} />
                  </button>
                </div>

                {/* Filter Button (Mobile) */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-[#FF7A19]"
                >
                  <SlidersHorizontal size={18} />
                  Filters
                </button>
              </div>
            </div>

            <div className="flex gap-6">
              {/* Filters Sidebar - Reduced width by 10% */}
              <div className={`
                lg:block lg:w-56 flex-shrink-0
                ${showFilters ? 'fixed inset-0 bg-black/50 z-50 lg:relative lg:bg-transparent' : 'hidden'}
              `}>
                <div className={`
                  bg-white rounded-xl border border-gray-200 p-6 h-fit
                  ${showFilters ? 'absolute right-0 top-0 bottom-0 w-80 overflow-y-auto' : ''}
                `}>
                  {/* Mobile Close */}
                  <div className="lg:hidden flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-[#1A1A1A]">Filters</h3>
                    <button onClick={() => setShowFilters(false)}>
                      <X size={20} />
                    </button>
                  </div>

                  {/* Price Range */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-sm text-[#1A1A1A] mb-3">Price Range</h3>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        value={filters.priceRange[1]}
                        onChange={(e) => setFilters({
                          ...filters,
                          priceRange: [0, parseInt(e.target.value)]
                        })}
                        className="w-full"
                      />
                      <div className="flex items-center justify-between text-xs text-[#3A3A3A]">
                        <span>GHS 0</span>
                        <span>GHS {filters.priceRange[1].toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-sm text-[#1A1A1A] mb-3">Categories ({categories.length})</h3>
                    <div className="space-y-2">
                      {categories.length === 0 ? (
                        <p className="text-xs text-gray-500">No categories available</p>
                      ) : (
                        categories.map((category) => (
                          <label key={category.id} className="flex items-center gap-2 text-sm text-[#3A3A3A] cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                              checked={filters.categories.includes(category.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters({
                                    ...filters,
                                    categories: [...filters.categories, category.id]
                                  });
                                } else {
                                  setFilters({
                                    ...filters,
                                    categories: filters.categories.filter(id => id !== category.id)
                                  });
                                }
                              }}
                            />
                            <span>{category.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Brands */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-sm text-[#1A1A1A] mb-3">Brands ({brands.length})</h3>
                    <div className="space-y-2">
                      {brands.length === 0 ? (
                        <p className="text-xs text-gray-500">No brands available</p>
                      ) : (
                        brands.map((brand) => (
                        <label key={brand.id} className="flex items-center gap-2 text-sm text-[#3A3A3A] cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                            checked={filters.brands.includes(brand.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters({
                                  ...filters,
                                  brands: [...filters.brands, brand.id]
                                });
                              } else {
                                setFilters({
                                  ...filters,
                                  brands: filters.brands.filter(id => id !== brand.id)
                                });
                              }
                            }}
                          />
                          <span>{brand.name}</span>
                        </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="mb-6">
                    <h3 className="font-semibold text-sm text-[#1A1A1A] mb-3">Availability</h3>
                    <label className="flex items-center gap-2 text-sm text-[#3A3A3A] cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-[#FF7A19] focus:ring-[#FF7A19]"
                        checked={filters.inStock}
                        onChange={(e) => setFilters({ ...filters, inStock: e.target.checked })}
                      />
                      <span>In Stock Only</span>
                    </label>
                  </div>

                  {/* Reset Filters */}
                  <Button variant="outline" size="sm" className="w-full" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </div>
              </div>

              {/* Products Grid */}
              <div className="flex-1">
                {/* Sort Bar */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#3A3A3A]">Sort by:</span>
                    <select
                      value={filters.sort}
                      onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                    >
                      <option value="featured">Featured</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="newest">Newest First</option>
                      <option value="popular">Most Popular</option>
                    </select>
                  </div>
                </div>

                {/* Products */}
                {filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-xl p-16 text-center">
                    <p className="text-[#3A3A3A] mb-4">No products found</p>
                    <Button variant="primary" onClick={resetFilters}>Clear Filters</Button>
                  </div>
                ) : (
                  <>
                    <div className={`
                      grid gap-4
                      ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1'}
                    `}>
                      {filteredProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
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
                          className="px-8 py-3"
                        >
                          Load More Products
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Ads - Right */}
          <SidebarAds position="right" page="shop" />
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

