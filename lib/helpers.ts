// Format currency to GH₵ (Ghanaian Cedis)
export const formatCurrency = (amount: number): string => {
  // Handle NaN, null, undefined, or invalid numbers
  const validAmount = Number(amount);
  if (isNaN(validAmount) || !isFinite(validAmount)) {
    console.warn('Invalid amount passed to formatCurrency:', amount);
    return 'GH₵ 0.00';
  }
  // Format with commas and 2 decimal places, then replace GHS with GH₵
  const formatted = new Intl.NumberFormat('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(validAmount);
  return `GH₵ ${formatted}`;
};

// Calculate discount percentage
export const calculateDiscountPercentage = (
  originalPrice: number,
  discountPrice: number
): number => {
  if (originalPrice <= 0) return 0;
  const discount = ((originalPrice - discountPrice) / originalPrice) * 100;
  return Math.round(discount);
};

// Format date
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-GH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

// Generate slug from string
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// Validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (Ghana format)
export const isValidPhoneNumber = (phone: string): boolean => {
  // Ghana phone numbers: +233 or 0 followed by 9 digits
  const phoneRegex = /^(\+233|0)[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Calculate cart total
export const calculateCartTotal = (
  items: Array<{ price: number; quantity: number }>
): number => {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
};

// Get image URL from Supabase storage
export const getImageUrl = (path: string, bucket: string = 'products'): string => {
  if (!path) return '/placeholders/placeholder-product.webp';
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return path;
  
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
};

// Debounce function for search
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Get stock status badge color
export const getStockStatusColor = (stock: number): string => {
  if (stock === 0) return 'text-red-600 bg-red-50';
  if (stock < 5) return 'text-red-600 bg-red-50'; // Low stock (less than 5) - red
  return 'text-green-600 bg-green-50';
};

// Get order status color
export const getOrderStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-50',
    processing: 'text-blue-600 bg-blue-50',
    shipped: 'text-purple-600 bg-purple-50',
    delivered: 'text-green-600 bg-green-50',
    cancelled: 'text-red-600 bg-red-50',
  };
  return statusColors[status.toLowerCase()] || 'text-gray-600 bg-gray-50';
};

// Calculate price range for products with variants
export interface PriceRange {
  min: number;
  max: number;
  hasRange: boolean;
}

export const calculatePriceRange = async (
  productId: string,
  basePrice: number
): Promise<PriceRange> => {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    // Get product attribute mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('product_attribute_mappings')
      .select('attribute_id')
      .eq('product_id', productId);

    if (mappingsError || !mappings || mappings.length === 0) {
      return { min: basePrice, max: basePrice, hasRange: false };
    }

    // Get all attributes and their options
    const attributeIds = mappings.map((m: any) => m.attribute_id);
    const { data: attributes } = await supabase
      .from('product_attributes')
      .select('id')
      .in('id', attributeIds);

    if (!attributes || attributes.length === 0) {
      return { min: basePrice, max: basePrice, hasRange: false };
    }

    // Get all options for these attributes
    const { data: allOptions } = await supabase
      .from('product_attribute_options')
      .select('attribute_id, price_modifier')
      .in('attribute_id', attributeIds)
      .eq('is_available', true);

    if (!allOptions || allOptions.length === 0) {
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
      hasRange: minPrice !== maxPrice,
    };
  } catch (error) {
    console.error('Error calculating price range:', error);
    return { min: basePrice, max: basePrice, hasRange: false };
  }
};

// Format price range display
export const formatPriceRange = (range: PriceRange): string => {
  if (!range.hasRange) {
    return formatCurrency(range.min);
  }
  return `${formatCurrency(range.min)} - ${formatCurrency(range.max)}`;
};

