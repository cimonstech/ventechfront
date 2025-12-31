import { supabase } from '@/lib/supabase';
import { Wishlist } from '@/types/product';

export const wishlistService = {
  // Get user's wishlist
  async getWishlist(userId: string): Promise<Wishlist[]> {
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          *,
          product:products(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        // 42P01 = relation does not exist (table not created yet)
        if (error.code === '42P01') {
          console.warn('Wishlist table does not exist yet. Please run create_wishlist_table.sql');
          return [];
        }
        throw error;
      }

      // Transform products to ensure proper structure (map price to original_price)
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        product: item.product ? {
          ...item.product,
          // Map price field to original_price for Product interface compatibility
          original_price: item.product.price || item.product.original_price || 0,
          discount_price: item.product.discount_price || null,
          // Ensure other fields are properly set
          category_name: item.product.category?.name || item.product.category_name || null,
          category_slug: item.product.category?.slug || item.product.category_slug || null,
          brand: item.product.brand?.name || item.product.brand || '',
          featured: item.product.is_featured || item.product.featured || false,
          // Parse key_specs if it's a string (JSONB from Supabase)
          key_specs: (() => {
            if (!item.product.key_specs) return undefined;
            if (Array.isArray(item.product.key_specs)) return item.product.key_specs;
            if (typeof item.product.key_specs === 'string') {
              try {
                const parsed = JSON.parse(item.product.key_specs);
                return Array.isArray(parsed) ? parsed : undefined;
              } catch (e) {
                console.warn('Failed to parse key_specs:', e);
                return undefined;
              }
            }
            return undefined;
          })(),
        } : null,
      }));

      return transformedData;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      return [];
    }
  },

  // Add product to wishlist
  async addToWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      // Check if already in wishlist
      const { data: existing, error: checkError } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows found (not an error)
        console.error('Error checking wishlist:', checkError);
        throw checkError;
      }

      if (existing) {
        return false; // Already in wishlist
      }

      const { error } = await supabase
        .from('wishlists')
        .insert({
          user_id: userId,
          product_id: productId,
        });

      if (error) {
        // 42P01 = relation does not exist (table not created yet)
        if (error.code === '42P01') {
          console.warn('Wishlist table does not exist yet. Please run create_wishlist_table.sql');
          return false;
        }
        // 23505 = unique_violation (already exists - race condition)
        if (error.code === '23505') {
          console.warn('Product already in wishlist (race condition)');
          return false;
        }
        console.error('Error adding to wishlist:', error);
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return false;
    }
  },

  // Remove product from wishlist
  async removeFromWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) {
        // 42P01 = relation does not exist (table not created yet)
        if (error.code === '42P01') {
          console.warn('Wishlist table does not exist yet. Please run create_wishlist_table.sql');
          return false;
        }
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      return false;
    }
  },

  // Check if product is in wishlist
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single();

      if (error) {
        // PGRST116 = no rows found (not an error, just not in wishlist)
        if (error.code === 'PGRST116') {
          return false;
        }
        // 42P01 = relation does not exist (table not created yet)
        if (error.code === '42P01') {
          console.warn('Wishlist table does not exist yet. Please run create_wishlist_table.sql');
          return false;
        }
        throw error;
      }
      return !!data;
    } catch (error) {
      console.error('Error checking wishlist:', error);
      return false;
    }
  },

  // Toggle wishlist (add if not present, remove if present)
  async toggleWishlist(userId: string, productId: string): Promise<boolean> {
    try {
      const isInWishlist = await this.isInWishlist(userId, productId);
      
      if (isInWishlist) {
        return await this.removeFromWishlist(userId, productId);
      } else {
        return await this.addToWishlist(userId, productId);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      return false;
    }
  },
};
