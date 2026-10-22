import { supabase } from '@/lib/supabase';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  website?: string;
  show_in_mega_menu: boolean;
  product_count: number;
  order: number;
  created_at: string;
}

// Fetch all brands
export const getBrands = async (): Promise<Brand[]> => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
};

// Fetch brands for filters (with products)
export const getFilterBrands = async (): Promise<Brand[]> => {
  try {
    console.log('Fetching brands...');
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Supabase error fetching brands:', error);
      throw error;
    }
    
    console.log('Brands fetched successfully:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching filter brands:', error);
    return [];
  }
};


