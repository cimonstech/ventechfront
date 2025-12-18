import { supabase } from '@/lib/supabase';
import { Product } from '@/types/product';
import { calculatePriceRangesForProducts } from './priceRange.service';

export interface PreOrderProduct extends Product {
  is_pre_order: boolean;
  estimated_arrival_date?: string;
  pre_order_available: boolean;
}

export interface PreOrderShippingOption {
  id: 'air_cargo' | 'ship_cargo';
  name: string;
  description: string;
  price: number;
  estimated_days_min: number;
  estimated_days_max: number;
  estimated_weeks_min: number;
  estimated_weeks_max: number;
}

// Pre-order shipping options
export const PRE_ORDER_SHIPPING_OPTIONS: PreOrderShippingOption[] = [
  {
    id: 'air_cargo',
    name: 'Air Cargo',
    description: 'Fast delivery via air freight',
    price: 400,
    estimated_days_min: 5,
    estimated_days_max: 14,
    estimated_weeks_min: 1,
    estimated_weeks_max: 2,
  },
  {
    id: 'ship_cargo',
    name: 'Ship Cargo',
    description: 'Economical delivery via sea freight',
    price: 200,
    estimated_days_min: 30,
    estimated_days_max: 60,
    estimated_weeks_min: 4,
    estimated_weeks_max: 8,
  },
];

// Calculate estimated arrival date based on shipping option
export const calculateEstimatedArrival = (
  shippingOption: PreOrderShippingOption
): { date: Date; formatted: string } => {
  const today = new Date();
  const arrivalDate = new Date(today);
  arrivalDate.setDate(today.getDate() + shippingOption.estimated_days_max);
  
  const formatted = arrivalDate.toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  return { date: arrivalDate, formatted };
};

// Format estimated delivery time
export const formatEstimatedDelivery = (option: PreOrderShippingOption): string => {
  if (option.estimated_weeks_min === option.estimated_weeks_max) {
    return `${option.estimated_weeks_min} week${option.estimated_weeks_min > 1 ? 's' : ''}`;
  }
  return `${option.estimated_weeks_min} to ${option.estimated_weeks_max} weeks`;
};

// Fetch pre-order products
export const getPreOrderProducts = async (): Promise<PreOrderProduct[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories!products_category_id_fkey(id, name, slug),
        brands!products_brand_id_fkey(id, name, slug)
      `)
      .eq('is_pre_order', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pre-order products:', error);
      return [];
    }

    // Transform products to ensure proper structure
    const transformedProducts = (data || []).map((product: any) => ({
      ...product,
      // Transform price field from DB to original_price (database uses 'price', interface expects 'original_price')
      original_price: product.price || product.original_price || 0,
      discount_price: product.discount_price || null,
      is_pre_order: true,
      pre_order_available: product.pre_order_available ?? true,
      // Flatten category and brand data
      category_name: product.categories?.name || product.category_name || null,
      category_slug: product.categories?.slug || product.category_slug || null,
      brand_name: product.brands?.name || product.brand_name || product.brand || null,
      brand_slug: product.brands?.slug || product.brand_slug || null,
    }));
    
    // Calculate price ranges for products with variants
    const priceRanges = await calculatePriceRangesForProducts(transformedProducts);
    
    // Add price ranges to products
    return transformedProducts.map((product: any) => {
      const range = priceRanges.get(product.id);
      return {
        ...product,
        price_range: range || {
          min: product.discount_price || product.original_price || 0,
          max: product.discount_price || product.original_price || 0,
          hasRange: false,
        },
      };
    });
  } catch (error) {
    console.error('Error fetching pre-order products:', error);
    return [];
  }
};

// Get pre-order shipping option by ID
export const getPreOrderShippingOption = (
  id: 'air_cargo' | 'ship_cargo'
): PreOrderShippingOption | undefined => {
  return PRE_ORDER_SHIPPING_OPTIONS.find((option) => option.id === id);
};

