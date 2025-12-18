import { supabase } from '@/lib/supabase';
import { Product } from '@/types/product';

export interface FlashDeal {
  id: string;
  title: string;
  description?: string;
  banner_image_url?: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashDealProduct {
  id: string;
  flash_deal_id: string;
  product_id: string;
  discount_percentage: number;
  flash_price?: number;
  sort_order: number;
  created_at: string;
  product?: Product;
}

// Fetch active flash deals
export const getActiveFlashDeals = async (): Promise<FlashDeal[]> => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('flash_deals')
      .select('*')
      .eq('is_active', true)
      .gte('end_time', now) // Deal hasn't ended yet
      .lte('start_time', now) // Deal has started
      .order('start_time', { ascending: true });

    if (error) {
      // Check if it's a 404 (table doesn't exist) - suppress error for expected scenario
      const errorCode = error.code || (error as any)?.statusCode || (error as any)?.status;
      const errorMessage = error.message || String(error) || '';
      const errorDetails = (error as any)?.details || '';
      const errorHint = (error as any)?.hint || '';
      
      // Check if error object is empty (common with PostgREST 404 errors)
      const errorKeys = Object.keys(error);
      const isEmptyError = errorKeys.length === 0 || (errorKeys.length === 1 && errorKeys[0] === 'code' && !errorCode);
      
      // Check for table missing errors (404, PGRST116, PGRST205, or relation errors)
      const isTableMissing = 
        isEmptyError || // Empty error object often means 404
        errorCode === 'PGRST116' || 
        errorCode === 'PGRST205' || // Table not found in schema cache
        errorCode === 404 || 
        errorCode === '404' ||
        errorMessage.includes('relation') || 
        errorMessage.includes('does not exist') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('Could not find the table') ||
        errorDetails.includes('relation') ||
        errorHint.includes('relation') ||
        errorHint.includes('Perhaps you meant');
      
      if (isTableMissing) {
        // Silently return empty array - table doesn't exist yet (expected if migration not run)
        // Don't log warnings for missing tables
        return [];
      }
      
      // For other errors, log but don't throw
      console.warn('Error fetching flash deals:', {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
        hint: errorHint
      });
      return [];
    }
    return data || [];
  } catch (error: any) {
    // Catch any unexpected errors and handle gracefully
    // Check if error is empty or is a table missing error
    if (!error || (typeof error === 'object' && Object.keys(error).length === 0)) {
      // Empty error object - likely a 404 from missing table, silently return
      return [];
    }
    
    const errorCode = error?.code || error?.statusCode || error?.status;
    const errorMessage = error?.message || String(error) || '';
    
    // Only log if it's not a table missing error
    const isTableMissing = 
      errorCode === 'PGRST116' || 
      errorCode === 'PGRST205' || // Table not found in schema cache
      errorCode === 404 || 
      errorCode === '404' ||
      errorMessage.includes('relation') || 
      errorMessage.includes('does not exist') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('Could not find the table');
    
    if (!isTableMissing) {
      console.warn('Unexpected error fetching flash deals:', {
        code: errorCode,
        message: errorMessage
      });
    }
    return [];
  }
};

// Fetch flash deal products
export const getFlashDealProducts = async (flashDealId?: string): Promise<FlashDealProduct[]> => {
  try {
    let query = supabase
      .from('flash_deal_products')
      .select(`
        *,
        product:products(*)
      `)
      .order('sort_order', { ascending: true });

    if (flashDealId) {
      query = query.eq('flash_deal_id', flashDealId);
    }

    const { data, error } = await query;

    if (error) {
      // Check if table doesn't exist - silently return empty array
      const errorCode = error.code || (error as any)?.statusCode || (error as any)?.status;
      const errorMessage = error.message || String(error) || '';
      const isTableMissing = 
        errorCode === 'PGRST116' || 
        errorCode === 404 || 
        errorMessage.includes('relation') || 
        errorMessage.includes('does not exist');
      
      if (isTableMissing) {
        return [];
      }
      // For other errors, log warning
      console.warn('Error fetching flash deal products:', { code: errorCode, message: errorMessage });
      return [];
    }
    return data || [];
  } catch (error: any) {
    // Silently handle errors - table might not exist
    return [];
  }
};

// Fetch products that are currently in flash deals
export const getFlashDealProductsList = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories!products_category_id_fkey(*),
        brand:brands!products_brand_id_fkey(*)
      `)
      .eq('is_flash_deal', true)
      .gte('flash_deal_end', new Date().toISOString())
      .lte('flash_deal_start', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      // Silently handle errors - might be missing columns or other expected issues
      return [];
    }
    return data || [];
  } catch (error: any) {
    // Silently handle errors - table/columns might not exist yet
    return [];
  }
};

// Calculate time remaining for flash deal
export const getTimeRemaining = (endTime: string): { hours: number; minutes: number; seconds: number } => {
  const now = new Date().getTime();
  const end = new Date(endTime).getTime();
  const difference = end - now;

  if (difference <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  const hours = Math.floor(difference / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
};

// Format time remaining as string
export const formatTimeRemaining = (endTime: string): string => {
  const { hours, minutes, seconds } = getTimeRemaining(endTime);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
