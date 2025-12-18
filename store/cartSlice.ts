import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, ProductVariant } from '@/types/product';

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
};

const calculateCartTotals = (items: CartItem[]) => {
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const total = items.reduce((sum, item) => {
    // Ensure subtotal is a valid number
    const subtotal = Number(item.subtotal) || 0;
    if (isNaN(subtotal)) {
      console.warn('Invalid subtotal for item:', item.id, item.name, item.subtotal);
      // Recalculate subtotal if invalid
      const basePrice = item.discount_price || item.original_price || 0;
      const variantAdjustments = Object.values(item.selected_variants || {}).reduce(
        (adjSum: number, variant: any) => {
          const adjustment = variant.price_adjustment ?? variant.price_modifier ?? 0;
          return adjSum + (Number(adjustment) || 0);
        },
        0
      );
      return sum + ((basePrice + variantAdjustments) * item.quantity);
    }
    return sum + subtotal;
  }, 0);
  return { itemCount, total };
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (
      state,
      action: PayloadAction<{
        product: CartItem;
        quantity: number;
        variants?: { [key: string]: ProductVariant };
      }>
    ) => {
      const { product, quantity, variants = {} } = action.payload;
      
      // Calculate price with variant adjustments
      const basePrice = product.discount_price || product.original_price || 0;
      // Handle both VariantOption format (price_modifier) and ProductVariant format (price_adjustment)
      const variantAdjustments = Object.values(variants).reduce(
        (sum, variant: any) => {
          const adjustment = variant.price_adjustment ?? variant.price_modifier ?? 0;
          return sum + adjustment;
        },
        0
      );
      const finalPrice = basePrice + variantAdjustments;

      // Check if item already exists
      const existingItemIndex = state.items.findIndex(
        (item) =>
          item.id === product.id &&
          JSON.stringify(item.selected_variants) === JSON.stringify(variants)
      );

      if (existingItemIndex !== -1) {
        // Update quantity
        state.items[existingItemIndex].quantity += quantity;
        state.items[existingItemIndex].subtotal =
          state.items[existingItemIndex].quantity * finalPrice;
      } else {
        // Add new item
        state.items.push({
          ...product,
          quantity,
          selected_variants: variants,
          subtotal: quantity * finalPrice,
        });
      }

      const totals = calculateCartTotals(state.items);
      state.itemCount = totals.itemCount;
      state.total = totals.total;
    },

    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      const totals = calculateCartTotals(state.items);
      state.itemCount = totals.itemCount;
      state.total = totals.total;
    },

    updateQuantity: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) => {
      const { id, quantity } = action.payload;
      const item = state.items.find((item) => item.id === id);
      
      if (item) {
        item.quantity = quantity;
        const basePrice = item.discount_price || item.original_price || 0;
        // Handle both VariantOption format (price_modifier) and ProductVariant format (price_adjustment)
        const variantAdjustments = Object.values(item.selected_variants).reduce(
          (sum, variant: any) => {
            const adjustment = variant.price_adjustment ?? variant.price_modifier ?? 0;
            return sum + adjustment;
          },
          0
        );
        item.subtotal = quantity * (basePrice + variantAdjustments);
      }

      const totals = calculateCartTotals(state.items);
      state.itemCount = totals.itemCount;
      state.total = totals.total;
    },

    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.itemCount = 0;
    },

    loadCartFromStorage: (state, action: PayloadAction<CartState>) => {
      return action.payload;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  loadCartFromStorage,
} = cartSlice.actions;

export default cartSlice.reducer;


