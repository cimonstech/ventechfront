import { formatCedis } from '@/lib/money';

export const formatCurrency = (amount: number): string => {
  const validAmount = Number(amount);
  if (isNaN(validAmount) || !isFinite(validAmount)) {
    return formatCedis(0);
  }
  return formatCedis(validAmount);
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
interface PriceRange {
  min: number;
  max: number;
  hasRange: boolean;
}

// Format price range display
export const formatPriceRange = (range: PriceRange): string => {
  if (!range.hasRange) {
    return formatCurrency(range.min);
  }
  return `${formatCurrency(range.min)} - ${formatCurrency(range.max)}`;
};

