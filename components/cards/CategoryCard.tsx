'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/types/product';
import { ArrowRight } from 'lucide-react';

interface CategoryCardProps {
  category: Category;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  return (
    <Link href={`/categories/${category.slug}`}>
      <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 h-full">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-orange-50 to-gray-50">
          <Image
            src={category.thumbnail || '/placeholders/placeholder-category.webp'}
            alt={`${category.name} products in Ghana - Shop ${category.name} at VENTECH`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />

          {/* Orange overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#FF7A19]/80 via-[#FF7A19]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1A1A1A]/90 to-transparent text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="text-base font-bold mb-1">{category.name}</h3>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-200">
              {category.product_count} {category.product_count === 1 ? 'product' : 'products'}
            </p>
            
            <div className="flex items-center gap-1 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span>Shop Now</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export const CategoryCardSimple: React.FC<CategoryCardProps> = ({ category }) => {
  return (
    <Link href={`/categories/${category.slug}`}>
      <div className="group flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-[#FF7A19] hover:shadow-md transition-all duration-200">
        {/* Icon/Image */}
        <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
          <Image
            src={category.thumbnail || '/placeholders/imageplaceholder.webp'}
            alt={`${category.name} icon`}
            width={32}
            height={32}
            className="object-contain"
          />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-[#1A1A1A] group-hover:text-[#FF7A19] transition-colors">
            {category.name}
          </h4>
          <p className="text-xs text-[#3A3A3A]">{category.product_count} items</p>
        </div>

        {/* Arrow */}
        <ArrowRight
          size={18}
          className="text-[#3A3A3A] group-hover:text-[#FF7A19] group-hover:translate-x-1 transition-all"
        />
      </div>
    </Link>
  );
};

