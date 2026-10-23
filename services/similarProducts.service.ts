import { supabase } from '@/lib/supabase';
import { Product } from '@/types/product';

// Get similar products based on category and brand
const getSimilarProducts = async (
  productId: string, 
  categoryId: string, 
  brandId: string, 
  limit: number = 4
): Promise<Product[]> => {
  try {
    let combined: Product[] = [];

    // First try to get products from the same category and brand (excluding current product)
    if (categoryId && brandId) {
      try {
        const { data: sameCategoryBrand, error: error1 } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', categoryId)
          .eq('brand_id', brandId)
          .neq('id', productId)
          .eq('in_stock', true)
          .limit(limit);

        if (error1) {
          console.warn('Error fetching same category and brand products:', error1.message);
        } else if (sameCategoryBrand) {
          combined = [...sameCategoryBrand];
        }
      } catch (err) {
        console.warn('Failed to fetch same category and brand products:', err);
      }
    }

    // If we have enough products, return them
    if (combined.length >= limit) {
      return combined.slice(0, limit);
    }

    // If not enough, get products from the same category (any brand)
    if (categoryId) {
      try {
        const { data: sameCategory, error: error2 } = await supabase
          .from('products')
          .select('*')
          .eq('category_id', categoryId)
          .neq('id', productId)
          .eq('in_stock', true)
          .limit(limit);

        if (error2) {
          console.warn('Error fetching same category products:', error2.message);
        } else if (sameCategory) {
          // Add products that aren't already in combined
          const newProducts = sameCategory.filter(p => !combined.some(cp => cp.id === p.id));
          combined = [...combined, ...newProducts];
        }
      } catch (err) {
        console.warn('Failed to fetch same category products:', err);
      }
    }

    // If still not enough, get products from the same brand (any category)
    if (combined.length < limit && brandId) {
      try {
        const { data: sameBrand, error: error3 } = await supabase
          .from('products')
          .select('*')
          .eq('brand_id', brandId)
          .neq('id', productId)
          .eq('in_stock', true)
          .limit(limit - combined.length);

        if (error3) {
          console.warn('Error fetching same brand products:', error3.message);
        } else if (sameBrand) {
          const newProducts = sameBrand.filter(p => !combined.some(cp => cp.id === p.id));
          combined = [...combined, ...newProducts];
        }
      } catch (err) {
        console.warn('Failed to fetch same brand products:', err);
      }
    }

    // If still not enough, get any other products
    if (combined.length < limit) {
      try {
        const { data: otherProducts, error: error4 } = await supabase
          .from('products')
          .select('*')
          .neq('id', productId)
          .eq('in_stock', true)
          .limit(limit - combined.length);

        if (error4) {
          console.warn('Error fetching other products:', error4.message);
        } else if (otherProducts) {
          const newProducts = otherProducts.filter(p => !combined.some(cp => cp.id === p.id));
          combined = [...combined, ...newProducts];
        }
      } catch (err) {
        console.warn('Failed to fetch other products:', err);
      }
    }

    return combined.slice(0, limit);
  } catch (error) {
    console.error('Failed to fetch similar products:', error);
    return [];
  }
};

// Get related products based on tags or keywords (if you have a tags system)
const getRelatedProducts = async (
  productId: string,
  tags: string[],
  limit: number = 4
): Promise<Product[]> => {
  try {
    // This is a placeholder for tag-based recommendations
    // You would need to implement a tags system in your database
    // For now, we'll use the category-based approach
    return [];
  } catch (error) {
    console.error('Failed to fetch related products:', error);
    return [];
  }
};

// Get recently viewed products (if you implement a view tracking system)
const getRecentlyViewedProducts = async (
  userId: string,
  limit: number = 4
): Promise<Product[]> => {
  try {
    // This would require a product_views table to track user viewing history
    // For now, we'll return an empty array
    return [];
  } catch (error) {
    console.error('Failed to fetch recently viewed products:', error);
    return [];
  }
};

// Export as object for convenience
export const similarProductsService = {
  getSimilarProducts,
  getRelatedProducts,
  getRecentlyViewedProducts,
};
