'use client';

import React, { useEffect, useState } from 'react';
import { SidebarAdCarousel } from './SidebarAdCarousel';
import { SidebarAd, SidebarAdGroup } from '@/types/sidebar';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { ShoppingCart } from 'lucide-react';
import { useAppDispatch } from '@/store';
import { addToCart } from '@/store/cartSlice';
import toast from 'react-hot-toast';

interface SidebarAdsProps {
  position: 'left' | 'right';
  page: string;
}

export const SidebarAds: React.FC<SidebarAdsProps> = ({ position, page }) => {
  const [adGroups, setAdGroups] = useState<SidebarAdGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useAppDispatch();

  useEffect(() => {
    loadAds();
  }, [position, page]);

  const loadAds = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/sidebar-ads?position=${position}&page=${page}`);
      // const data = await response.json();
      
      // Mock data for now
      const mockAds: SidebarAd[] = [
        {
          id: '1',
          title: 'Summer Sale',
          image_url: '/banners/store2-home-pic2.webp',
          link: '/deals',
          position: 'right',
          show_on: ['homepage', 'shop'],
          active: true,
          sort_order: 1,
        },
        {
          id: '2',
          title: 'New Arrivals',
          image_url: '/banners/store2-home-pic3.webp',
          link: '/categories/new',
          position: 'right',
          show_on: ['homepage', 'shop'],
          slider_group: 'group-1',
          active: true,
          sort_order: 2,
        },
        {
          id: '3',
          title: 'Hot Deals',
          image_url: '/banners/store2-slider-bg3.webp',
          link: '/deals',
          position: 'right',
          show_on: ['homepage', 'shop'],
          slider_group: 'group-1',
          active: true,
          sort_order: 3,
        },
        // Product ad example
        {
          id: '4',
          title: 'Featured Product',
          image_url: '/placeholders/placeholder-product.webp',
          link: '/product/iphone-15-pro',
          position: 'right',
          show_on: ['homepage', 'shop'],
          active: true,
          sort_order: 4,
          is_product_ad: true,
          product_id: 'iphone-15-pro',
          product_name: 'iPhone 15 Pro',
          product_price: 1399.99,
          product_discount_price: 1199.99,
          add_to_cart_enabled: true,
        },
      ];

      const grouped = groupAdsBySlider(mockAds);
      setAdGroups(grouped);
    } catch (error) {
      console.error('Failed to load sidebar ads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupAdsBySlider = (ads: SidebarAd[]): SidebarAdGroup[] => {
    const groups: { [key: string]: SidebarAd[] } = {};

    ads.forEach((ad) => {
      const key = ad.slider_group || ad.id;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(ad);
    });

    return Object.entries(groups).map(([group_id, ads]) => ({
      group_id,
      ads: ads.sort((a, b) => a.sort_order - b.sort_order),
    }));
  };

  const handleAddToCart = (ad: SidebarAd) => {
    if (!ad.is_product_ad || !ad.product_id) return;

    // Create a mock product object for the cart
    const product = {
      id: ad.product_id,
      name: ad.product_name || 'Product',
      original_price: ad.product_price || 0,
      discount_price: ad.product_discount_price || ad.product_price || 0,
      thumbnail: ad.image_url,
      slug: ad.link.replace('/product/', ''),
      in_stock: true,
      stock_quantity: 10,
      rating: 4.5,
      rating_count: 10,
      reviews_count: 5,
      is_featured: false,
      category_id: '',
      brand_id: '',
      brand: '',
      category: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const cartItem = {
      ...product,
      quantity: 1,
      selected_variants: {},
      subtotal: ad.product_discount_price || ad.product_price || 0,
    };

    dispatch(addToCart({
      product: cartItem,
      quantity: 1,
    }));

    toast.success(`${ad.product_name} added to cart!`);
  };

  if (isLoading || adGroups.length === 0) {
    return null;
  }

  return (
    <aside
      className={`hidden xl:block w-52 sticky top-20 h-fit ${
        position === 'left' ? 'mr-6' : 'ml-6'
      }`}
    >
      <div className="space-y-4">
        {adGroups.map((group) => (
          <div key={group.group_id}>
            {group.ads.length > 1 ? (
              <SidebarAdCarousel ads={group.ads} />
            ) : (
              <div className="block rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                <Link href={group.ads[0].link}>
                  <div className="relative aspect-square">
                    <Image
                      src={group.ads[0].image_url || '/placeholders/placeholder-ad.webp'}
                      alt={group.ads[0].title || 'Advertisement'}
                      fill
                      sizes="(max-width: 1200px) 0vw, 13vw"
                      className="object-cover"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                </Link>
                
                {/* Product ad content */}
                {group.ads[0].is_product_ad && (
                  <div className="p-3 bg-white">
                    <h4 className="font-semibold text-sm text-[#1A1A1A] mb-1 line-clamp-1">
                      {group.ads[0].product_name}
                    </h4>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-bold text-[#1A1A1A]">
                          GH₵{group.ads[0].product_discount_price || group.ads[0].product_price}
                        </span>
                        {group.ads[0].product_discount_price && group.ads[0].product_price && (
                          <span className="text-xs text-[#3A3A3A] line-through">
                            GH₵{group.ads[0].product_price}
                          </span>
                        )}
                      </div>
                    </div>
                    {group.ads[0].add_to_cart_enabled && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full text-xs"
                        icon={<ShoppingCart size={12} />}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddToCart(group.ads[0]);
                        }}
                      >
                        Add to Cart
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};

