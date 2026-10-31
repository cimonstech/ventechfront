'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CategoryCard, CategoryCardSimple } from '@/components/cards/CategoryCard';
import { Button } from '@/components/ui/Button';
import { Grid, List } from 'lucide-react';
import { LoadGate, ProductGridSkeleton } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import { Category } from '@/types/product';
import { getCategories } from '@/services/category.service';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const query = useListQuery();

  const fetchCategories = useCallback(() => {
    return query.run(async () => {
      setCategories(await getCategories());
    });
  }, [query.run]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

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
            {query.loaded && !query.error
              ? `${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`
              : ' '}
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

        <LoadGate
          loaded={query.loaded}
          loading={query.loading}
          updating={query.updating}
          error={query.error}
          isEmpty={categories.length === 0}
          onRetry={() => void fetchCategories()}
          skeleton={<ProductGridSkeleton count={8} />}
          emptyTitle="No categories yet"
          emptyDescription="Browse the shop while we add more product groups."
          emptyPrimary={{ label: 'Browse the shop', href: '/shop' }}
        >
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <CategoryCardSimple key={category.id} category={category} />
              ))}
            </div>
          )}
        </LoadGate>
      </div>
    </div>
  );
}

