import { supabase } from '@/lib/supabase';
import { Category } from '@/types/product';

// Fetch all categories with accurate product counts
export const getCategories = async (): Promise<Category[]> => {
  try {
    // Fetching categories
    
    // First, fetch all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('order', { ascending: true });

    if (categoriesError) {
      console.error('Supabase error fetching categories:', categoriesError);
      throw categoriesError;
    }
    
    if (!categories || categories.length === 0) {
      // Categories fetched (empty)
      return [];
    }
    
    // Fetch product counts for each category
    const categoryIds = categories.map(cat => cat.id);
    const { data: productCounts, error: countsError } = await supabase
      .from('products')
      .select('category_id')
      .in('category_id', categoryIds);
    
    if (countsError) {
      console.warn('Error fetching product counts, using stored values:', countsError);
    }
    
    // Calculate product counts for each category
    const countsMap = new Map<string, number>();
    if (productCounts) {
      productCounts.forEach((product: any) => {
        if (product.category_id) {
          countsMap.set(product.category_id, (countsMap.get(product.category_id) || 0) + 1);
        }
      });
    }
    
    // Map categories with accurate product counts and image mapping
    const categoriesWithCounts = categories.map(category => ({
      ...category,
      product_count: countsMap.get(category.id) || 0,
      // Map image fields: prioritize image_url, then thumbnail_url, then thumbnail
      thumbnail: (category as any).image_url || (category as any).thumbnail_url || category.thumbnail || '',
    }));
    
    // Categories fetched successfully
    return categoriesWithCounts;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

// Fetch categories for filters (active, with products) - uses getCategories for accurate counts
export const getFilterCategories = async (): Promise<Category[]> => {
  try {
    // Use getCategories which calculates accurate product counts
    const categories = await getCategories();
    
    // Filter out categories with no products
    return categories.filter(cat => cat.product_count > 0);
  } catch (error) {
    console.error('Error fetching filter categories:', error);
    return [];
  }
};

// Fetch category by slug
export const getCategoryBySlug = async (slug: string): Promise<Category | null> => {
  try {
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      console.warn('Invalid slug provided to getCategoryBySlug:', slug);
      return null;
    }

    // Use select('*') to get all columns, then map them correctly
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug.trim())
      .maybeSingle();

    if (error) {
      // Only log non-404 errors (PGRST116 = not found, 42P01 = table doesn't exist)
      const errorCode = (error as any)?.code;
      const errorMessage = (error as any)?.message || String(error);
      
      if (errorCode !== 'PGRST116' && errorCode !== '42P01') {
        console.error('Error fetching category:', {
          code: errorCode,
          message: errorMessage,
          details: error,
          slug: slug,
        });
      }
      return null;
    }

    if (!data) {
      return null;
    }

    // Map image fields: prioritize image_url, then thumbnail_url, then thumbnail (actual column)
    return {
      ...data,
      thumbnail: (data as any).image_url || (data as any).thumbnail_url || data.thumbnail || '',
    };
  } catch (error) {
    // Better error logging for exceptions
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : { error: String(error), type: typeof error };
    
    console.error('Error fetching category (exception):', errorDetails);
    return null;
  }
};



