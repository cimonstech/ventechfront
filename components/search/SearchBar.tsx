'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { searchService } from '@/services/search.service';
import { Product } from '@/types/product';
import { formatCurrency } from '@/lib/helpers';
import Image from 'next/image';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
  onSearch?: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search products...",
  className = "",
  showSuggestions = true,
  onSearch
}) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{
    products: Product[];
    categories: string[];
    brands: string[];
  }>({ products: [], categories: [], brands: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load popular searches on mount
  useEffect(() => {
    const loadPopularSearches = async () => {
      const popular = await searchService.getPopularSearches();
      setPopularSearches(popular);
    };
    loadPopularSearches();
  }, []);

  // Handle search input changes
  const handleInputChange = async (value: string) => {
    setQuery(value);
    
    if (value.length >= 2) {
      setIsLoading(true);
      try {
        const suggestionsData = await searchService.getSearchSuggestions(value);
        setSuggestions(suggestionsData);
        setIsOpen(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      setSuggestions({ products: [], categories: [], brands: [] });
      setIsOpen(value.length > 0);
    }
  };

  // Handle search submission
  const handleSearch = (searchQuery?: string) => {
    const searchTerm = searchQuery || query.trim();
    if (searchTerm) {
      setIsOpen(false);
      if (onSearch) {
        onSearch(searchTerm);
      } else {
        router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
      }
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pl-12 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent text-sm"
          suppressHydrationWarning
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSuggestions({ products: [], categories: [], brands: [] });
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search Suggestions Dropdown */}
      {isOpen && showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF7A19] mx-auto"></div>
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : query.length >= 2 ? (
            <div className="py-2">
              {/* Products */}
              {suggestions.products.length > 0 && (
                <div className="px-4 py-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Products
                  </h3>
                  <div className="space-y-1">
                    {suggestions.products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleSuggestionClick(product.name)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded text-left"
                      >
                        <div className="w-8 h-8 relative flex-shrink-0">
                          <Image
                            src={product.thumbnail || '/placeholder-product.jpg'}
                            alt={product.name}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatCurrency(product.discount_price || product.price)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              {suggestions.categories.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {suggestions.categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => handleSuggestionClick(category)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left"
                      >
                        <Clock size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700">{category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Brands */}
              {suggestions.brands.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Brands
                  </h3>
                  <div className="space-y-1">
                    {suggestions.brands.map((brand) => (
                      <button
                        key={brand}
                        onClick={() => handleSuggestionClick(brand)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-left"
                      >
                        <TrendingUp size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700">{brand}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {suggestions.products.length === 0 && 
               suggestions.categories.length === 0 && 
               suggestions.brands.length === 0 && (
                <div className="px-4 py-6 text-center text-gray-500">
                  <p className="text-sm">No results found for "{query}"</p>
                  <button
                    onClick={() => handleSearch()}
                    className="mt-2 text-sm text-[#FF7A19] hover:underline"
                  >
                    Search anyway
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Popular Searches */
            <div className="py-2">
              <div className="px-4 py-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Popular Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSuggestionClick(term)}
                      className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
