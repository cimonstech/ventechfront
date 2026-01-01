'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/cards/ProductCard';
import { SearchBar } from '@/components/search/SearchBar';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Filter, 
  SortAsc, 
  SortDesc, 
  Grid, 
  List,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { searchService, SearchResult } from '@/services/search.service';
import { Product } from '@/types/product';
import { getCategories } from '@/services/category.service';
import { getBrands } from '@/services/brand.service';
import { Category } from '@/types/product';
import { Brand } from '@/services/brand.service';

interface SearchFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'name' | 'price' | 'rating' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [searchResults, setSearchResults] = useState<SearchResult>({
    products: [],
    total: 0,
    categories: [],
    brands: []
  });
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  
  const productsPerPage = 20;

  // Load categories and brands for filters
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [categoriesData, brandsData] = await Promise.all([
          getCategories(),
          getBrands()
        ]);
        setAllCategories(categoriesData);
        setAllBrands(brandsData);
      } catch (error) {
        console.error('Error loading filter data:', error);
      }
    };
    loadFilterData();
  }, []);

  // Search products
  const searchProducts = async (searchQuery: string, page: number = 1) => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const offset = (page - 1) * productsPerPage;
      const results = await searchService.searchProducts(searchQuery, {
        ...filters,
        limit: productsPerPage,
        offset
      });
      
      setSearchResults(results);
      setCurrentPage(page);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial search
  useEffect(() => {
    if (query) {
      searchProducts(query);
    }
  }, [query]);

  // Search when filters change
  useEffect(() => {
    if (query) {
      searchProducts(query, 1);
    }
  }, [filters]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleSortChange = (sortBy: SearchFilters['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const totalPages = Math.ceil(searchResults.total / productsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-4">
            {query ? `Search Results for "${query}"` : 'Search Products'}
          </h1>
        </div>

        {/* Results Summary */}
        {query && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                {isLoading ? 'Searching...' : `${searchResults.total || searchResults.products.length} results found`}
              </p>
              
              {/* Active Filters */}
              {Object.entries(filters).some(([_, value]) => value !== undefined && value !== '') && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Filters:</span>
                  {filters.category && (
                    <Badge variant="default" className="text-xs">
                      Category: {allCategories.find(c => c.id === filters.category)?.name}
                      <button
                        onClick={() => handleFilterChange('category', undefined)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  )}
                  {filters.brand && (
                    <Badge variant="default" className="text-xs">
                      Brand: {allBrands.find(b => b.id === filters.brand)?.name}
                      <button
                        onClick={() => handleFilterChange('brand', undefined)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  )}
                  {filters.minPrice !== undefined && (
                    <Badge variant="default" className="text-xs">
                      Min: GHS {filters.minPrice}
                      <button
                        onClick={() => handleFilterChange('minPrice', undefined)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  )}
                  {filters.maxPrice !== undefined && (
                    <Badge variant="default" className="text-xs">
                      Max: GHS {filters.maxPrice}
                      <button
                        onClick={() => handleFilterChange('maxPrice', undefined)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  )}
                  <button
                    onClick={clearFilters}
                    className="text-xs text-[#FF7A19] hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={`${filters.sortBy || 'rating'}-${filters.sortOrder || 'desc'}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    handleSortChange(sortBy as SearchFilters['sortBy']);
                  }}
                  className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                >
                  <option value="rating-desc">Best Match</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="price-asc">Price Low to High</option>
                  <option value="price-desc">Price High to Low</option>
                  <option value="created_at-desc">Newest First</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-[#FF7A19] text-white' : 'text-gray-600'}`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-[#FF7A19] text-white' : 'text-gray-600'}`}
                >
                  <List size={16} />
                </button>
              </div>

              {/* Filters Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <SlidersHorizontal size={16} />
                Filters
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="w-64 bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-semibold text-[#1A1A1A] mb-4">Filters</h3>
              
              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Category</h4>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                >
                  <option value="">All Categories</option>
                  {allCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Brand</h4>
                <select
                  value={filters.brand || ''}
                  onChange={(e) => handleFilterChange('brand', e.target.value || undefined)}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                >
                  <option value="">All Brands</option>
                  {allBrands.map(brand => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Price Range</h4>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={filters.minPrice || ''}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  />
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={filters.maxPrice || ''}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                  />
                </div>
              </div>

              {/* Stock Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Availability</h4>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.inStock || false}
                    onChange={(e) => handleFilterChange('inStock', e.target.checked || undefined)}
                    className="w-4 h-4 text-[#FF7A19] border-gray-300 rounded focus:ring-[#FF7A19]"
                  />
                  <span className="ml-2 text-sm text-gray-700">In Stock Only</span>
                </label>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="w-full h-48 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : searchResults.products.length > 0 ? (
              <>
                {/* Products Grid */}
                <div className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                    : 'grid-cols-1'
                }`}>
                  {searchResults.products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onQuickView={() => {}}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => searchProducts(query, currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "primary" : "outline"}
                          size="sm"
                          onClick={() => searchProducts(query, page)}
                        >
                          {page}
                        </Button>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => searchProducts(query, currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : query ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No products found for "{query}"</p>
                <p className="text-sm text-gray-400">Try adjusting your search terms or filters</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Enter a search term to find products</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
