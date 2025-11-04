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
import { supabase } from '@/lib/supabase';
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
      setIsLoading(true);
      
      // Fetch ads from database
      const { data, error } = await supabase
        .from('sidebar_ads')
        .select('*')
        .eq('active', true)
        .eq('position', position)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching sidebar ads:', error);
        // If table doesn't exist, return empty array
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          setAdGroups([]);
          return;
        }
        throw error;
      }

      // Filter ads by current page
      // Only show on shop and product details pages
      if (page !== 'shop' && page !== 'product') {
        // Not a valid page for sidebar ads
        setAdGroups([]);
        return;
      }

      const filteredAds: SidebarAd[] = (data || [])
        .filter((ad: any) => {
          // Check if ad should show on this page
          const showOn = Array.isArray(ad.show_on) ? ad.show_on : (ad.show_on ? [ad.show_on] : []);
          // Only show ads that are configured for the current page
          return showOn.includes(page);
        })
        .map((ad: any) => ({
          id: ad.id,
          title: ad.title || '',
          image_url: ad.image_url || '',
          link: ad.link || '',
          position: ad.position || 'right',
          show_on: Array.isArray(ad.show_on) ? ad.show_on : (ad.show_on ? [ad.show_on] : []),
          slider_group: ad.slider_group || undefined,
          active: ad.active !== false,
          sort_order: ad.sort_order || 0,
          // Product ad fields
          is_product_ad: ad.is_product_ad || false,
          product_id: ad.product_id || undefined,
          product_name: ad.product_name || undefined,
          product_price: ad.product_price || undefined,
          product_discount_price: ad.product_discount_price || undefined,
          add_to_cart_enabled: ad.add_to_cart_enabled || false,
        }));

      const grouped = groupAdsBySlider(filteredAds);
      setAdGroups(grouped);
    } catch (error) {
      console.error('Failed to load sidebar ads:', error);
      setAdGroups([]);
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
      slug: ad.link.replace('/product/', ''),
      description: ad.product_name || '',
      category_id: '',
      brand: '',
      brand_id: '',
      original_price: ad.product_price || 0,
      discount_price: ad.product_discount_price || ad.product_price || 0,
      in_stock: true,
      stock_quantity: 10,
      images: [ad.image_url],
      thumbnail: ad.image_url,
      featured: false,
      rating: 4.5,
      review_count: 5,
      specs: {},
      variants: [],
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

