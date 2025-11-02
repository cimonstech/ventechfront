import { supabase } from '@/lib/supabase';

export interface PriceRange {
  min: number;
  max: number;
  hasRange: boolean;
}

/**
 * Calculate price range for a product based on its variants
 * Returns the minimum and maximum possible prices
 */
export const calculateProductPriceRange = async (
  productId: string,
  basePrice: number
): Promise<PriceRange> => {
  try {
    // Get product attribute mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('product_attribute_mappings')
      .select('attribute_id')
      .eq('product_id', productId);

    if (mappingsError || !mappings || mappings.length === 0) {
      return { min: basePrice, max: basePrice, hasRange: false };
    }

    // Get all attributes
    const attributeIds = mappings.map((m: any) => m.attribute_id);
    
    // Get all options for these attributes
    const { data: allOptions, error: optionsError } = await supabase
      .from('product_attribute_options')
      .select('attribute_id, price_modifier')
      .in('attribute_id', attributeIds)
      .eq('is_available', true);

    if (optionsError || !allOptions || allOptions.length === 0) {
      return { min: basePrice, max: basePrice, hasRange: false };
    }

    // Group options by attribute_id
    const optionsByAttribute: { [key: string]: number[] } = {};
    allOptions.forEach((option: any) => {
      if (!optionsByAttribute[option.attribute_id]) {
        optionsByAttribute[option.attribute_id] = [];
      }
      optionsByAttribute[option.attribute_id].push(option.price_modifier || 0);
    });

    // Calculate min and max price adjustments
    // Min: sum of minimum price modifiers from each attribute
    // Max: sum of maximum price modifiers from each attribute
    let minAdjustment = 0;
    let maxAdjustment = 0;

    Object.values(optionsByAttribute).forEach((priceModifiers) => {
      if (priceModifiers.length > 0) {
        const min = Math.min(...priceModifiers);
        const max = Math.max(...priceModifiers);
        minAdjustment += min;
        maxAdjustment += max;
      }
    });

    const minPrice = basePrice + minAdjustment;
    const maxPrice = basePrice + maxAdjustment;

    return {
      min: minPrice,
      max: maxPrice,
      hasRange: minPrice !== maxPrice && maxAdjustment !== 0,
    };
  } catch (error) {
    console.error('Error calculating price range:', error);
    return { min: basePrice, max: basePrice, hasRange: false };
  }
};

/**
 * Batch calculate price ranges for multiple products
 */
export const calculatePriceRangesForProducts = async (
  products: Array<{ id: string; original_price: number; discount_price?: number }>
): Promise<Map<string, PriceRange>> => {
  const ranges = new Map<string, PriceRange>();

  // Get all product IDs
  const productIds = products.map(p => p.id);

  if (productIds.length === 0) {
    return ranges;
  }

  try {
    // Get all attribute mappings for these products
    const { data: mappings } = await supabase
      .from('product_attribute_mappings')
      .select('product_id, attribute_id')
      .in('product_id', productIds);

    if (!mappings || mappings.length === 0) {
      // No variants, return base prices
      products.forEach(product => {
        const basePrice = product.discount_price || product.original_price;
        ranges.set(product.id, { min: basePrice, max: basePrice, hasRange: false });
      });
      return ranges;
    }

    // Get all attribute IDs
    const attributeIds = [...new Set(mappings.map((m: any) => m.attribute_id))];

    // Get all options for these attributes
    const { data: allOptions } = await supabase
      .from('product_attribute_options')
      .select('attribute_id, price_modifier')
      .in('attribute_id', attributeIds)
      .eq('is_available', true);

    if (!allOptions || allOptions.length === 0) {
      products.forEach(product => {
        const basePrice = product.discount_price || product.original_price;
        ranges.set(product.id, { min: basePrice, max: basePrice, hasRange: false });
      });
      return ranges;
    }

    // Group mappings by product_id
    const mappingsByProduct: { [key: string]: string[] } = {};
    mappings.forEach((m: any) => {
      if (!mappingsByProduct[m.product_id]) {
        mappingsByProduct[m.product_id] = [];
      }
      mappingsByProduct[m.product_id].push(m.attribute_id);
    });

    // Group options by attribute_id
    const optionsByAttribute: { [key: string]: number[] } = {};
    allOptions.forEach((option: any) => {
      if (!optionsByAttribute[option.attribute_id]) {
        optionsByAttribute[option.attribute_id] = [];
      }
      optionsByAttribute[option.attribute_id].push(option.price_modifier || 0);
    });

    // Calculate range for each product
    products.forEach(product => {
      const basePrice = product.discount_price || product.original_price;
      const productAttributes = mappingsByProduct[product.id] || [];

      if (productAttributes.length === 0) {
        ranges.set(product.id, { min: basePrice, max: basePrice, hasRange: false });
        return;
      }

      let minAdjustment = 0;
      let maxAdjustment = 0;

      productAttributes.forEach((attributeId: string) => {
        const priceModifiers = optionsByAttribute[attributeId] || [];
        if (priceModifiers.length > 0) {
          const min = Math.min(...priceModifiers);
          const max = Math.max(...priceModifiers);
          minAdjustment += min;
          maxAdjustment += max;
        }
      });

      const minPrice = basePrice + minAdjustment;
      const maxPrice = basePrice + maxAdjustment;

      ranges.set(product.id, {
        min: minPrice,
        max: maxPrice,
        hasRange: minPrice !== maxPrice && maxAdjustment !== 0,
      });
    });

    return ranges;
  } catch (error) {
    console.error('Error calculating price ranges:', error);
    // Fallback: return base prices
    products.forEach(product => {
      const basePrice = product.discount_price || product.original_price;
      ranges.set(product.id, { min: basePrice, max: basePrice, hasRange: false });
    });
    return ranges;
  }
};

