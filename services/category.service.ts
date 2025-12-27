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
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, description, image_url, thumbnail_url, icon, parent_id, product_count, order, created_at')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      // Only log non-404 errors
      if ((error as any)?.code !== 'PGRST116' && (error as any)?.code !== '42P01') {
        console.error('Error fetching category:', error);
      }
      return null;
    }
    // Map image fields: prioritize image_url, then thumbnail_url
    if (data) {
      return {
        ...data,
        thumbnail: (data as any).image_url || (data as any).thumbnail_url || '',
      };
    }
    return data;
  } catch (error) {
    console.error('Error fetching category (exception):', error);
    return null;
  }
};


