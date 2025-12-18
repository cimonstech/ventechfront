'use client';

import React from 'react';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { CategoryCardMobile } from '@/components/cards/CategoryCardMobile';
import { Category } from '@/types/product';

interface CategoryCarouselProps {
  categories: Category[];
}

export const CategoryCarousel: React.FC<CategoryCarouselProps> = ({ categories }) => {

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Mobile: Grid layout with mobile-specific cards (4 columns, 2 rows for 8 categories) */}
      <div className="md:hidden">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {categories.slice(0, 8).map((category) => (
            <CategoryCardMobile key={category.id} category={category} />
          ))}
        </div>
      </div>

      {/* Desktop: Single responsive row (max 8 categories) */}
      <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-8 gap-3 lg:gap-4">
        {categories.slice(0, 8).map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
};

