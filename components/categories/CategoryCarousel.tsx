'use client';

import React, { useState, useEffect } from 'react';
import { CategoryCard } from '@/components/cards/CategoryCard';
import { Category } from '@/types/product';

interface CategoryCarouselProps {
  categories: Category[];
}

export const CategoryCarousel: React.FC<CategoryCarouselProps> = ({ categories }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardsPerView = 2; // Show 2 cards per view on mobile
  const maxIndex = Math.max(0, categories.length - cardsPerView);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (categories.length <= cardsPerView) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % (maxIndex + 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [categories.length, maxIndex]);

  const scrollPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? maxIndex : prev - 1));
  };

  const scrollNext = () => {
    setCurrentIndex((prev) => (prev === maxIndex ? 0 : prev + 1));
  };

  if (categories.length === 0) {
    return null;
  }

  // Don't show carousel if we have fewer cards than cardsPerView
  if (categories.length <= cardsPerView) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Mobile: Carousel */}
      <div className="md:hidden overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`,
          }}
        >
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex-shrink-0 px-1.5"
              style={{ width: `${100 / cardsPerView}%` }}
            >
              <CategoryCard category={category} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Grid (max 8 per row, always one row) */}
      <div className="hidden md:grid md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 sm:gap-4">
        {categories.slice(0, 8).map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>

      {/* Mobile Navigation Arrows - Removed per user request */}

      {/* Mobile Dots Indicator */}
      {categories.length > cardsPerView && (
        <div className="flex justify-center gap-2 mt-4 md:hidden">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-6 bg-[#FF7A19]'
                  : 'w-2 bg-gray-300'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

