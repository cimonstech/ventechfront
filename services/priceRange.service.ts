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
    // Get all attribute mappings for these products (include is_required)
    const { data: mappings } = await supabase
      .from('product_attribute_mappings')
      .select('product_id, attribute_id, is_required')
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

    // Get selected options for all products (from product_selected_options table)
    const { data: selectedOptions } = await supabase
      .from('product_selected_options')
      .select('product_id, attribute_id, option_id')
      .in('product_id', productIds);

    // Get all options for these attributes (only selected ones for each product)
    const { data: allOptions } = await supabase
      .from('product_attribute_options')
      .select('id, attribute_id, price_modifier')
      .in('attribute_id', attributeIds)
      .eq('is_available', true);

    if (!allOptions || allOptions.length === 0) {
      products.forEach(product => {
        const basePrice = product.discount_price || product.original_price;
        ranges.set(product.id, { min: basePrice, max: basePrice, hasRange: false });
      });
      return ranges;
    }

    // Group mappings by product_id (with is_required info)
    const mappingsByProduct: { [key: string]: Array<{ attributeId: string; isRequired: boolean }> } = {};
    mappings.forEach((m: any) => {
      if (!mappingsByProduct[m.product_id]) {
        mappingsByProduct[m.product_id] = [];
      }
      mappingsByProduct[m.product_id].push({
        attributeId: m.attribute_id,
        isRequired: m.is_required || false,
      });
    });

    // Group selected options by product_id and attribute_id
    const selectedOptionsByProduct: { [key: string]: { [key: string]: string[] } } = {};
    (selectedOptions || []).forEach((item: any) => {
      if (!selectedOptionsByProduct[item.product_id]) {
        selectedOptionsByProduct[item.product_id] = {};
      }
      if (!selectedOptionsByProduct[item.product_id][item.attribute_id]) {
        selectedOptionsByProduct[item.product_id][item.attribute_id] = [];
      }
      selectedOptionsByProduct[item.product_id][item.attribute_id].push(item.option_id);
    });

    // Create a map of option_id to price_modifier
    const optionPriceMap: { [key: string]: number } = {};
    allOptions.forEach((option: any) => {
      optionPriceMap[option.id] = option.price_modifier || 0;
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
      let hasAnyVariants = false;

      productAttributes.forEach(({ attributeId, isRequired }) => {
        // Get selected options for this product and attribute
        const selectedOptionIds = selectedOptionsByProduct[product.id]?.[attributeId] || [];
        
        if (selectedOptionIds.length === 0) {
          // No selected options for this attribute - skip it
          return;
        }

        hasAnyVariants = true;
        
        // Get price modifiers for selected options only
        const priceModifiers = selectedOptionIds
          .map((optionId: string) => optionPriceMap[optionId])
          .filter((modifier: number) => modifier !== undefined);

        if (priceModifiers.length > 0) {
          const min = Math.min(...priceModifiers);
          const max = Math.max(...priceModifiers);
          
          // For price range display: minimum should be base price (0 adjustment) if:
          // 1. Attribute is optional (can skip selection)
          // 2. Minimum modifier is 0 or positive (no discount)
          // Otherwise, use the minimum modifier
          if (!isRequired || min >= 0) {
            // Optional attribute or all modifiers are positive/zero
            // Minimum can be base price (0 adjustment) if no variant selected
            minAdjustment += 0; // Start from base price
          } else {
            // Required attribute with negative modifiers (discounts)
            minAdjustment += min; // Use minimum modifier
          }
          maxAdjustment += max; // Always use maximum modifier
        }
      });

      // If no variants are selected for this product, use base price
      if (!hasAnyVariants) {
        ranges.set(product.id, { min: basePrice, max: basePrice, hasRange: false });
        return;
      }

      const minPrice = basePrice + minAdjustment;
      const maxPrice = basePrice + maxAdjustment;

      ranges.set(product.id, {
        min: minPrice,
        max: maxPrice,
        hasRange: minPrice !== maxPrice, // Show range if min and max differ
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

