import { supabase } from '@/lib/supabase';
import { Product } from '@/types/product';
import { calculatePriceRangesForProducts } from './priceRange.service';

interface GetProductsParams {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'rating';
  limit?: number;
  offset?: number;
}

// Fetch products with filters
export const getProducts = async (params: GetProductsParams = {}): Promise<Product[]> => {
  try {
    let query = supabase
      .from('products')
      .select(`
        *,
        rating,
        review_count,
        categories!products_category_id_fkey(id, name, slug),
        brands!products_brand_id_fkey(id, name, slug)
      `);

    // Apply filters
    if (params.category) {
      query = query.eq('category_id', params.category);
    }
    if (params.brand) {
      query = query.eq('brand_id', params.brand);
    }
    if (params.minPrice !== undefined) {
      query = query.gte('price', params.minPrice);
    }
    if (params.maxPrice !== undefined) {
      query = query.lte('price', params.maxPrice);
    }
    if (params.inStock !== undefined) {
      query = query.eq('in_stock', params.inStock);
    }
    if (params.featured !== undefined) {
      query = query.eq('is_featured', params.featured);
      // If fetching featured products, exclude pre-orders (pre-orders cannot be featured)
      if (params.featured === true) {
        query = query.eq('is_pre_order', false);
      }
    }

    // Apply sorting
    switch (params.sortBy) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching products with relations:', error);
      
      // Fallback: Try fetching without explicit foreign key
      console.log('Attempting to fetch products with simple relations...');
      let fallbackQuery = supabase
        .from('products')
        .select(`
          *,
          rating,
          review_count,
          categories:category_id(id, name, slug),
          brands:brand_id(id, name, slug)
        `);
      
      // Apply featured filter if provided
      if (params.featured !== undefined) {
        fallbackQuery = fallbackQuery.eq('is_featured', params.featured);
        // If fetching featured products, exclude pre-orders (pre-orders cannot be featured)
        if (params.featured === true) {
          fallbackQuery = fallbackQuery.eq('is_pre_order', false);
        }
      }
      
      const { data: productsOnly, error: fallbackError } = await fallbackQuery
        .order('created_at', { ascending: false })
        .limit(params.limit || 50);
      
      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        // Last resort: fetch without relations
        let basicQuery = supabase
          .from('products')
          .select('*, rating, review_count');
        
        // Apply featured filter if provided
        if (params.featured !== undefined) {
          basicQuery = basicQuery.eq('is_featured', params.featured);
          // If fetching featured products, exclude pre-orders (pre-orders cannot be featured)
          if (params.featured === true) {
            basicQuery = basicQuery.eq('is_pre_order', false);
          }
        }
        
        const { data: productsBasic } = await basicQuery
          .order('created_at', { ascending: false })
          .limit(params.limit || 50);
        
        const basicProducts = (productsBasic || []).map((p: any) => ({
          ...p,
          original_price: p.price,
          category_name: null,
          brand: p.brand_name || '',
          featured: p.is_featured || false,
          // Parse key_specs if it's a string (JSONB from Supabase)
          key_specs: (() => {
            if (!p.key_specs) return undefined;
            if (Array.isArray(p.key_specs)) return p.key_specs;
            if (typeof p.key_specs === 'string') {
              try {
                const parsed = JSON.parse(p.key_specs);
                return Array.isArray(parsed) ? parsed : undefined;
              } catch (e) {
                console.warn('Failed to parse key_specs:', e);
                return undefined;
              }
            }
            return undefined;
          })(),
          // Ensure rating and review_count are properly included and defaulted
          rating: (() => {
            const ratingValue = p.rating;
            if (typeof ratingValue === 'number' && !isNaN(ratingValue)) return ratingValue;
            if (typeof ratingValue === 'string') {
              const parsed = parseFloat(ratingValue);
              return !isNaN(parsed) ? parsed : 0;
            }
            return 0;
          })(),
          review_count: (() => {
            const reviewCountValue = p.review_count;
            if (typeof reviewCountValue === 'number' && !isNaN(reviewCountValue)) return reviewCountValue;
            if (typeof reviewCountValue === 'string') {
              const parsed = parseInt(reviewCountValue, 10);
              return !isNaN(parsed) ? parsed : 0;
            }
            return 0;
          })(),
        }));
        
        // Calculate price ranges for basic products too
        const priceRanges = await calculatePriceRangesForProducts(basicProducts);
        return basicProducts.map((product: any) => {
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
      }
      
      console.log('Fetched products with simple relations:', productsOnly?.length || 0);
      const transformedProducts = (productsOnly || []).map((p: any) => ({
        ...p,
        // Always use 'price' field from DB as original_price (source of truth)
        original_price: p.price || 0,
        category_name: p.categories?.name || p.category_name || null,
        category_slug: p.categories?.slug || p.category_slug || null,
        brand: p.brands?.name || p.brand || '',
        featured: p.is_featured || false,
        // Parse key_specs if it's a string (JSONB from Supabase)
        key_specs: (() => {
          if (!p.key_specs) return undefined;
          if (Array.isArray(p.key_specs)) return p.key_specs;
          if (typeof p.key_specs === 'string') {
            try {
              const parsed = JSON.parse(p.key_specs);
              return Array.isArray(parsed) ? parsed : undefined;
            } catch (e) {
              console.warn('Failed to parse key_specs:', e);
              return undefined;
            }
          }
          return undefined;
        })(),
        // Ensure rating and review_count are properly included and defaulted
        rating: (() => {
          const ratingValue = p.rating;
          if (typeof ratingValue === 'number' && !isNaN(ratingValue)) return ratingValue;
          if (typeof ratingValue === 'string') {
            const parsed = parseFloat(ratingValue);
            return !isNaN(parsed) ? parsed : 0;
          }
          return 0;
        })(),
        review_count: (() => {
          const reviewCountValue = p.review_count;
          if (typeof reviewCountValue === 'number' && !isNaN(reviewCountValue)) return reviewCountValue;
          if (typeof reviewCountValue === 'string') {
            const parsed = parseInt(reviewCountValue, 10);
            return !isNaN(parsed) ? parsed : 0;
          }
          return 0;
        })(),
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
    }
    
    // Transform products to ensure proper structure
    const transformedProducts = (data || []).map((product: any) => ({
      ...product,
      // Always use 'price' field from DB as original_price (source of truth)
      // Ignore product.original_price if it exists (it might be stale or wrong)
      original_price: product.price || 0,
      category_name: product.categories?.name || product.category_name || null,
      category_slug: product.categories?.slug || product.category_slug || null,
      brand: product.brands?.name || product.brand || '',
      featured: product.is_featured || false,
      // Parse key_specs if it's a string (JSONB from Supabase)
      key_specs: (() => {
        if (!product.key_specs) return undefined;
        if (Array.isArray(product.key_specs)) return product.key_specs;
        if (typeof product.key_specs === 'string') {
          try {
            const parsed = JSON.parse(product.key_specs);
            return Array.isArray(parsed) ? parsed : undefined;
          } catch (e) {
            console.warn('Failed to parse key_specs:', e);
            return undefined;
          }
        }
        return undefined;
      })(),
      // Ensure rating and review_count are properly included and defaulted
      // Handle both number and string types, and parse if needed
      rating: (() => {
        const ratingValue = product.rating;
        if (typeof ratingValue === 'number' && !isNaN(ratingValue)) return ratingValue;
        if (typeof ratingValue === 'string') {
          const parsed = parseFloat(ratingValue);
          return !isNaN(parsed) ? parsed : 0;
        }
        return 0;
      })(),
      review_count: (() => {
        const reviewCountValue = product.review_count;
        if (typeof reviewCountValue === 'number' && !isNaN(reviewCountValue)) return reviewCountValue;
        if (typeof reviewCountValue === 'string') {
          const parsed = parseInt(reviewCountValue, 10);
          return !isNaN(parsed) ? parsed : 0;
        }
        return 0;
      })(),
      // Remove nested objects that might cause issues
      categories: undefined,
      brands: undefined,
    }));
    
    // Calculate price ranges for products with variants
    const priceRanges = await calculatePriceRangesForProducts(transformedProducts);
    
    // Add price ranges to products
    const productsWithRanges = transformedProducts.map((product: any) => {
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
    
    console.log('Successfully fetched products with relations:', productsWithRanges.length);
    return productsWithRanges;
  } catch (error) {
    console.error('Error fetching products:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return [];
  }
};

// Fetch single product by slug
export const getProductBySlug = async (slug: string): Promise<Product | null> => {
  try {
    // Try with explicit foreign key names first
    let { data, error } = await supabase
      .from('products')
      .select(`
        *,
        rating,
        review_count,
        categories!products_category_id_fkey(id, name, slug),
        brands!products_brand_id_fkey(id, name, slug)
      `)
      .eq('slug', slug)
      .single();

    // If that fails, try with automatic foreign key resolution
    if (error) {
      console.warn('First query failed, trying alternative query:', error);
      const result = await supabase
        .from('products')
        .select(`
          *,
          rating,
          review_count,
          categories:category_id(id, name, slug),
          brands:brand_id(id, name, slug)
        `)
        .eq('slug', slug)
        .single();
      
      data = result.data;
      error = result.error;
    }

    // If still fails, try without relations
    if (error) {
      console.warn('Second query failed, fetching without relations:', error);
      const result = await supabase
        .from('products')
        .select('*, rating, review_count')
        .eq('slug', slug)
        .single();
      
      data = result.data;
      error = result.error;
      
      // If we got data but no relations, fetch them separately
      if (data && !error) {
        const [categoryResult, brandResult] = await Promise.all([
          data.category_id ? supabase.from('categories').select('id, name, slug').eq('id', data.category_id).single() : { data: null },
          data.brand_id ? supabase.from('brands').select('id, name, slug').eq('id', data.brand_id).single() : { data: null },
        ]);
        
        data = {
          ...data,
          categories: categoryResult.data,
          brands: brandResult.data,
        };
      }
    }

    if (error) {
      console.error('Error fetching product by slug:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Transform the data to match Product interface
    const product = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      key_features: data.key_features || null,
      // Parse key_specs if it's a string (JSONB from Supabase)
      key_specs: (() => {
        if (!data.key_specs) return undefined;
        if (Array.isArray(data.key_specs)) return data.key_specs;
        if (typeof data.key_specs === 'string') {
          try {
            const parsed = JSON.parse(data.key_specs);
            return Array.isArray(parsed) ? parsed : undefined;
          } catch (e) {
            console.warn('Failed to parse key_specs:', e);
            return undefined;
          }
        }
        return undefined;
      })(),
      specifications: data.specifications || null,
      category_id: data.category_id,
      brand: data.brands?.name || '',
      brand_id: data.brand_id || null,
      // Always use 'price' field from DB as original_price
      // The 'price' column is the source of truth (updated when products are saved)
      // Ignore data.original_price if it exists (it might be stale or wrong)
      original_price: data.price || 0,
      discount_price: data.discount_price || null,
      in_stock: data.in_stock,
      stock_quantity: data.stock_quantity || 0,
      images: data.images || [],
      thumbnail: data.thumbnail || '',
      featured: data.is_featured || false,
      rating: (() => {
        const ratingValue = data.rating;
        if (typeof ratingValue === 'number' && !isNaN(ratingValue)) return ratingValue;
        if (typeof ratingValue === 'string') {
          const parsed = parseFloat(ratingValue);
          return !isNaN(parsed) ? parsed : 0;
        }
        return 0;
      })(),
      review_count: (() => {
        const reviewCountValue = data.review_count;
        if (typeof reviewCountValue === 'number' && !isNaN(reviewCountValue)) return reviewCountValue;
        if (typeof reviewCountValue === 'string') {
          const parsed = parseInt(reviewCountValue, 10);
          return !isNaN(parsed) ? parsed : 0;
        }
        return 0;
      })(),
      specs: data.specs || {},
      variants: [], // TODO: Add variants if needed
      created_at: data.created_at,
      updated_at: data.updated_at,
      category_name: data.categories?.name || null,
      category_slug: data.categories?.slug || null,
      brand_name: data.brands?.name || null,
      brand_slug: data.brands?.slug || null
    };

    // Calculate price range for this product (with error handling)
    try {
      const basePrice = product.discount_price || product.original_price;
      const priceRange = await calculatePriceRangesForProducts([{
        id: product.id,
        original_price: product.original_price,
        discount_price: product.discount_price,
      }]);
      
      (product as any).price_range = priceRange.get(product.id) || {
        min: basePrice,
        max: basePrice,
        hasRange: false,
      };
    } catch (error) {
      console.error('Error calculating price range (skipping):', error);
      // Fallback: use base price
      const basePrice = product.discount_price || product.original_price;
      (product as any).price_range = {
        min: basePrice,
        max: basePrice,
        hasRange: false,
      };
    }
    
    return product;
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return null;
  }
};

// Fetch featured products (excludes pre-order products - pre-orders cannot be featured)
export const getFeaturedProducts = async (limit: number = 8): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name, slug), brands(name, slug)')
      .eq('is_featured', true)
      .eq('is_pre_order', false) // Pre-order products cannot be featured
      .eq('in_stock', true) // Must be in stock
      .limit(limit);

    if (error) throw error;
    
    // Transform products to ensure proper structure
    const transformedProducts = (data || []).map((product: any) => ({
      ...product,
      original_price: product.price || 0,
      category_name: product.categories?.name || null,
      category_slug: product.categories?.slug || null,
      brand: product.brands?.name || product.brand || '',
      featured: product.is_featured || false,
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
    console.error('Error fetching featured products:', error);
    return [];
  }
};

// Fetch similar products
export const getSimilarProducts = async (productId: string, categoryId: string, limit: number = 4): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name, slug), brands(name, slug)')
      .eq('category_id', categoryId)
      .neq('id', productId)
      .eq('in_stock', true)
      .limit(limit);

    if (error) throw error;
    
    // Transform products to ensure proper structure
    const transformedProducts = (data || []).map((product: any) => ({
      ...product,
      original_price: product.price || 0,
      category_name: product.categories?.name || null,
      category_slug: product.categories?.slug || null,
      brand: product.brands?.name || product.brand || '',
      featured: product.is_featured || false,
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
    console.error('Error fetching similar products:', error);
    return [];
  }
};

// Search products
export const searchProducts = async (query: string, limit: number = 20): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name, slug), brands(name, slug)')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('in_stock', true)
      .limit(limit);

    if (error) throw error;
    
    // Transform products to ensure proper structure
    const transformedProducts = (data || []).map((product: any) => ({
      ...product,
      original_price: product.price || 0,
      category_name: product.categories?.name || null,
      category_slug: product.categories?.slug || null,
      brand: product.brands?.name || product.brand || '',
      featured: product.is_featured || false,
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
    console.error('Error searching products:', error);
    return [];
  }
};

// Delete product (admin only)
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Export as object for backward compatibility
export const productService = {
  getProducts,
  getProductBySlug,
  getFeaturedProducts,
  getSimilarProducts,
  searchProducts,
  deleteProduct,
};
