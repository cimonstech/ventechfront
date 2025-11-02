'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Banner } from '@/types/banner';
import { Button } from '../ui/Button';

interface HeroSliderProps {
  banners: Banner[];
  autoPlayInterval?: number;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  banners,
  autoPlayInterval = 5000,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [banners.length, autoPlayInterval]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  if (banners.length === 0) {
    return (
      <div className="relative w-full aspect-[16/6] max-h-[250px] sm:max-h-[300px] md:max-h-[350px] bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="text-center text-white px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Welcome to VENTECH</h1>
          <p className="text-xl md:text-2xl mb-8">Your trusted tech store</p>
          <Link href="/categories">
            <Button variant="secondary" size="lg">
              Shop Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/6] max-h-[250px] sm:max-h-[300px] md:max-h-[350px] rounded-xl overflow-hidden group">
      {/* Slides */}
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Background Image */}
          <Image
            src={banner.image_url || '/placeholders/placeholder-banner.webp'}
            alt={banner.title}
            fill
            className="object-cover"
            priority={index === 0}
            unoptimized
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

          {/* Content */}
          <div className="relative h-full container mx-auto px-4 flex items-center">
            <div className="max-w-2xl text-white">
              {banner.subtitle && (
                <p className="text-sm md:text-base font-medium text-blue-300 mb-2 uppercase tracking-wide">
                  {banner.subtitle}
                </p>
              )}
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4">
                {banner.title}
              </h2>
              {banner.description && (
                <p className="text-base md:text-xl text-gray-200 mb-6 max-w-xl">
                  {banner.description}
                </p>
              )}
              {banner.link_url && (
                <Link href={banner.link_url}>
                  <Button variant="primary" size="lg">
                    {banner.link_text || 'Shop Now'}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="text-white" size={24} />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="text-white" size={24} />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};



