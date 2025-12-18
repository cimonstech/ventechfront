export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  key_features?: string | string[]; // Key features as JSON string or array
  specifications?: string | Record<string, any>; // Specifications as JSON string or object
  category_id: string;
  brand: string;
  brand_id?: string; // Optional brand_id for database relationships
  original_price: number;
  discount_price: number | null;
  in_stock: boolean;
  stock_quantity: number;
  images: string[];
  thumbnail: string;
  featured: boolean;
  rating: number;
  review_count: number;
  specs: ProductSpecs;
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
  is_pre_order?: boolean; // Pre-order product flag
  pre_order_available?: boolean; // Pre-order availability
  // Flattened properties for search results
  category_name?: string | null;
  category_slug?: string | null;
  brand_name?: string | null;
  brand_slug?: string | null;
  price_range?: {
    min: number;
    max: number;
    hasRange: boolean;
  };
}

export interface ProductSpecs {
  [key: string]: string | number | boolean;
  // Common specs examples:
  // processor?: string;
  // ram?: string;
  // storage?: string;
  // screen_size?: string;
  // battery?: string;
  // camera?: string;
  // color?: string;
  // weight?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  type: 'ram' | 'storage' | 'color' | 'warranty' | 'size';
  name: string;
  value: string;
  price_adjustment: number; // Additional cost or discount
  stock_quantity: number;
  sku: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  thumbnail: string;
  product_count: number;
  parent_id: string | null;
  order: number;
  created_at: string;
}

export interface ProductFilter {
  category?: string;
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  rating?: number;
  sortBy?: 'name' | 'price' | 'rating' | 'newest';
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selected_variants: {
    [key: string]: ProductVariant;
  };
  subtotal: number;
  is_pre_order?: boolean;
  pre_order_shipping_option?: 'air_cargo' | 'ship_cargo';
}

export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  product: Product;
  created_at: string;
}


