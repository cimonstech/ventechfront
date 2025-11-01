'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SidebarAd } from '@/types/sidebar';
import Autoplay from 'embla-carousel-autoplay';

interface SidebarAdCarouselProps {
  ads: SidebarAd[];
}

export const SidebarAdCarousel: React.FC<SidebarAdCarouselProps> = ({ ads }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 4000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow group">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {ads.map((ad) => (
            <div key={ad.id} className="flex-[0_0_100%]">
              <Link href={ad.link}>
                <div className="relative aspect-square">
                  <Image
                    src={ad.image_url || '/placeholders/placeholder-ad.webp'}
                    alt={ad.title || 'Advertisement'}
                    fill
                    sizes="(max-width: 1200px) 0vw, 13vw"
                    className="object-cover"
                    loading="lazy"
                    unoptimized
                  />
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {ads.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            aria-label="Previous ad"
          >
            <ChevronLeft size={18} className="text-[#1A1A1A]" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            aria-label="Next ad"
          >
            <ChevronRight size={18} className="text-[#1A1A1A]" />
          </button>
        </>
      )}

      {/* Dots */}
      {ads.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {ads.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === selectedIndex
                  ? 'bg-[#FF7A19] w-6'
                  : 'bg-white/60 hover:bg-white/90'
              }`}
              aria-label={`Go to ad ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

