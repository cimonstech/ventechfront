'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface AdvertBanner {
  id: string;
  title?: string;
  image_url: string;
  link_url: string;
  link_type?: 'page' | 'category' | 'product' | 'external';
}

interface AdvertBannerCarouselProps {
  banners: AdvertBanner[];
}

export const AdvertBannerCarousel: React.FC<AdvertBannerCarouselProps> = ({ banners }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-slide every 3 seconds
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) {
    return null;
  }

  // Determine if link is external
  const isExternalLink = (url: string) => {
    return url.startsWith('http://') || url.startsWith('https://');
  };

  // Render banner content
  const renderBanner = (banner: AdvertBanner, index: number) => {
    const content = (
      <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
        <div className="relative w-full h-full overflow-hidden rounded-xl bg-gray-100">
          <Image
            src={banner.image_url}
            alt={banner.title || `Banner ${index + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
          />
        </div>
      </div>
    );

    if (!banner.link_url) {
      return content;
    }

    if (isExternalLink(banner.link_url)) {
      return (
        <a
          href={banner.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {content}
        </a>
      );
    }

    return (
      <Link href={banner.link_url} className="block">
        {content}
      </Link>
    );
  };

  return (
    <div className="relative w-full">
      {/* Mobile: Carousel - One banner at a time, landscape, auto-slide */}
      <div className="md:hidden overflow-hidden w-full relative">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`,
            width: `${banners.length * 100}%`
          }}
        >
          {banners.map((banner, index) => (
            <div 
              key={banner.id} 
              className="flex-shrink-0"
              style={{ width: `${100 / banners.length}%` }}
            >
              {renderBanner(banner, index)}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Carousel - One banner at a time, landscape, auto-slide */}
      <div className="hidden md:block overflow-hidden w-full relative">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`,
            width: `${banners.length * 100}%`
          }}
        >
          {banners.map((banner, index) => (
            <div 
              key={banner.id} 
              className="flex-shrink-0"
              style={{ width: `${100 / banners.length}%` }}
            >
              {renderBanner(banner, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

