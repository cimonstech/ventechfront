'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CategoryCard, CategoryCardSimple } from '@/components/cards/CategoryCard';
import { Button } from '@/components/ui/Button';
import CheckmarkLoader from '@/components/loaders/CheckmarkLoader';
import { Grid, List } from 'lucide-react';
import { Category } from '@/types/product';
import { getCategories } from '@/services/category.service';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Shop by Category</h1>
          <p className="text-gray-600">Browse all product categories</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} found
          </p>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              size="sm"
              icon={<Grid size={16} />}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              icon={<List size={16} />}
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <CheckmarkLoader size={72} color="#FF7A19" speedMs={600} />
          </div>
        )}

        {/* Categories Grid */}
        {!isLoading && viewMode === 'grid' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}

        {/* Categories List */}
        {!isLoading && viewMode === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <CategoryCardSimple key={category.id} category={category} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && categories.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-4">No categories available</p>
            <Link href="/">
              <Button variant="primary">Back to Home</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

