import { supabase } from '@/lib/supabase';
import { Product } from '@/types/product';

export interface SearchResult {
  products: Product[];
  total: number;
  categories: string[];
  brands: string[];
}

export const searchService = {
  // Search products by query
  async searchProducts(query: string, filters?: {
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    sortBy?: 'name' | 'price' | 'rating' | 'created_at';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<SearchResult> {
    try {
      if (!query || query.trim().length < 2) {
        return {
          products: [],
          total: 0,
          categories: [],
          brands: []
        };
      }

      // Build the search query - search in product fields first
      // Note: count with relationships can be problematic, so we'll use products.length as fallback
      let searchQuery = supabase
        .from('products')
        .select(`
          *,
          category:categories!products_category_id_fkey(name, slug),
          brand:brands!products_brand_id_fkey(name, slug)
        `, { count: 'exact' })
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`);

      // Also search for products by category and brand names
      const { data: categoryMatches } = await supabase
        .from('categories')
        .select('id')
        .ilike('name', `%${query}%`);

      const { data: brandMatches } = await supabase
        .from('brands')
        .select('id')
        .ilike('name', `%${query}%`);

      // If we found matching categories or brands, search for products in those categories/brands
      if ((categoryMatches && categoryMatches.length > 0) || (brandMatches && brandMatches.length > 0)) {
        let additionalQuery = supabase
          .from('products')
          .select(`
            *,
            category:categories!products_category_id_fkey(name, slug),
            brand:brands!products_brand_id_fkey(name, slug)
          `);

        const conditions = [];
        if (categoryMatches && categoryMatches.length > 0) {
          conditions.push(`category_id.in.(${categoryMatches.map(c => c.id).join(',')})`);
        }
        if (brandMatches && brandMatches.length > 0) {
          conditions.push(`brand_id.in.(${brandMatches.map(b => b.id).join(',')})`);
        }

        if (conditions.length > 0) {
          additionalQuery = additionalQuery.or(conditions.join(','));
        }

        // Execute both queries and combine results
        const [productResults, additionalResults] = await Promise.all([
          searchQuery,
          additionalQuery
        ]);

        if (productResults.error) throw productResults.error;
        if (additionalResults.error) throw additionalResults.error;

        // Combine and deduplicate results
        const allProducts = [...(productResults.data || []), ...(additionalResults.data || [])];
        const uniqueProducts = allProducts.filter((product, index, self) => 
          index === self.findIndex(p => p.id === product.id)
        );

        // Get unique categories and brands from results
        const categories = [...new Set(uniqueProducts?.map(p => p.category?.name).filter(Boolean) || [])];
        const brands = [...new Set(uniqueProducts?.map(p => p.brand?.name).filter(Boolean) || [])];

        // Transform products to flatten nested objects
        const transformedProducts = uniqueProducts.map(product => ({
          ...product,
          // Map price field to original_price for Product interface compatibility
          original_price: product.price || 0,
          category_name: product.category?.name || null,
          category_slug: product.category?.slug || null,
          brand_name: product.brand?.name || null,
          brand_slug: product.brand?.slug || null,
          // Remove nested objects to avoid React rendering issues
          category: undefined,
          brand: undefined
        }));

        return {
          products: transformedProducts,
          total: transformedProducts.length,
          categories,
          brands
        };
      }

      // Apply filters
      if (filters?.category) {
        searchQuery = searchQuery.eq('category_id', filters.category);
      }

      if (filters?.brand) {
        searchQuery = searchQuery.eq('brand_id', filters.brand);
      }

      if (filters?.minPrice !== undefined) {
        searchQuery = searchQuery.gte('price', filters.minPrice);
      }

      if (filters?.maxPrice !== undefined) {
        searchQuery = searchQuery.lte('price', filters.maxPrice);
      }

      if (filters?.inStock !== undefined) {
        searchQuery = searchQuery.eq('in_stock', filters.inStock);
      }

      // Apply sorting
      if (filters?.sortBy) {
        const order = filters.sortOrder || 'desc';
        searchQuery = searchQuery.order(filters.sortBy, { ascending: order === 'asc' });
      } else {
        // Default sorting by relevance (name match first, then rating)
        searchQuery = searchQuery.order('rating', { ascending: false });
      }

      // Apply pagination
      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;
      searchQuery = searchQuery.range(offset, offset + limit - 1);

      const { data: products, error, count } = await searchQuery;

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      // Transform products to flatten nested objects
      const transformedProducts = (products || []).map(product => ({
        ...product,
        // Map price field to original_price for Product interface compatibility
        original_price: product.price || 0,
        category_name: product.category?.name || null,
        category_slug: product.category?.slug || null,
        brand_name: product.brand?.name || null,
        brand_slug: product.brand?.slug || null,
        // Remove nested objects to avoid React rendering issues
        category: undefined,
        brand: undefined
      }));

      // Get unique categories and brands from results
      const categories = [...new Set(products?.map(p => p.category?.name).filter(Boolean) || [])];
      const brands = [...new Set(products?.map(p => p.brand?.name).filter(Boolean) || [])];

      return {
        products: transformedProducts,
        total: count || transformedProducts.length || 0,
        categories,
        brands
      };
    } catch (error) {
      console.error('Error searching products:', error);
      return {
        products: [],
        total: 0,
        categories: [],
        brands: []
      };
    }
  },

  // Get search suggestions
  async getSearchSuggestions(query: string, limit: number = 5): Promise<{
    products: Product[];
    categories: string[];
    brands: string[];
  }> {
    try {
      if (!query || query.trim().length < 2) {
        return { products: [], categories: [], brands: [] };
      }

      // Search products for suggestions (simplified - only search in product fields)
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id, name, slug, thumbnail, price, discount_price,
          category:categories!products_category_id_fkey(name),
          brand:brands!products_brand_id_fkey(name)
        `)
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        console.error('Suggestions error:', error);
        return { products: [], categories: [], brands: [] };
      }

      // Transform products to flatten nested objects
      const transformedProducts = (products || []).map(product => {
        const p = product as any;
        return {
          ...product,
          // Map price field to original_price for Product interface compatibility
          original_price: p.price || 0,
          category_name: Array.isArray(p.category) ? null : p.category?.name || null,
          brand_name: Array.isArray(p.brand) ? null : p.brand?.name || null,
          // Remove nested objects
          category: undefined,
          brand: undefined
        };
      });

      // Get category suggestions
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(3);

      // Get brand suggestions
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name')
        .ilike('name', `%${query}%`)
        .limit(3);

      // If we found matching categories or brands, also search for products in those categories/brands
      let additionalProducts: any[] = [];
      if ((categories && categories.length > 0) || (brands && brands.length > 0)) {
        const { data: categoryProducts } = await supabase
          .from('products')
          .select(`
            id, name, slug, thumbnail, price, discount_price,
            category:categories!products_category_id_fkey(name),
            brand:brands!products_brand_id_fkey(name)
          `)
          .in('category_id', categories?.map(c => c.id) || [])
          .limit(5);

        const { data: brandProducts } = await supabase
          .from('products')
          .select(`
            id, name, slug, thumbnail, price, discount_price,
            category:categories!products_category_id_fkey(name),
            brand:brands!products_brand_id_fkey(name)
          `)
          .in('brand_id', brands?.map(b => b.id) || [])
          .limit(5);

        additionalProducts = [...(categoryProducts || []), ...(brandProducts || [])];
      }

      // Combine and deduplicate all products
      const allProducts = [...(products || []), ...additionalProducts];
      const uniqueProducts = allProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );

      // Transform unique products to flatten nested objects
      const transformedUniqueProducts = uniqueProducts.map(product => {
        const p = product as any;
        return {
          ...product,
          // Map price field to original_price for Product interface compatibility
          original_price: p.price || 0,
          category_name: Array.isArray(p.category) ? null : p.category?.name || null,
          brand_name: Array.isArray(p.brand) ? null : p.brand?.name || null,
          // Remove nested objects
          category: undefined,
          brand: undefined
        };
      });

      return {
        products: transformedUniqueProducts,
        categories: categories?.map(c => c.name) || [],
        brands: brands?.map(b => b.name) || []
      };
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return { products: [], categories: [], brands: [] };
    }
  },

  // Get popular search terms
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
      // This would typically come from a search analytics table
      // For now, return some common search terms
      return [
        'iPhone',
        'Samsung Galaxy',
        'MacBook',
        'Dell Laptop',
        'AirPods',
        'iPad',
        'Gaming Laptop',
        'Wireless Headphones',
        'Smart Watch',
        'Tablet'
      ].slice(0, limit);
    } catch (error) {
      console.error('Error getting popular searches:', error);
      return [];
    }
  }
};
