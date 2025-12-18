'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/types/product';

interface CategoryCardMobileProps {
  category: Category;
}

export const CategoryCardMobile: React.FC<CategoryCardMobileProps> = ({ category }) => {
  return (
    <Link href={`/categories/${category.slug}`}>
      <div className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
        {/* White top half with icon */}
        <div className="flex-1 bg-white flex items-center justify-center p-3 sm:p-4 min-h-[70px] sm:min-h-[80px]">
          <div className="relative w-10 h-10 sm:w-12 sm:h-12">
            <Image
              src={(category as any).image_url || (category as any).thumbnail_url || category.thumbnail || '/placeholders/placeholder-category.webp'}
              alt={`${category.name} icon`}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 40px, 48px"
            />
          </div>
        </div>

        {/* Orange bottom half with category name */}
        <div className="bg-[#FF7A19] px-1.5 py-2 sm:py-2.5 text-center flex items-center justify-center min-h-[48px]">
          <h5 className="text-[9px] sm:text-[10px] font-semibold text-white leading-tight break-words hyphens-auto px-0.5">
            {category.name}
          </h5>
        </div>
      </div>
    </Link>
  );
};

