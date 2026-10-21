import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WishlistState {
  items: string[]; // Array of product IDs
  count: number;
  isLoading: boolean;
}

const initialState: WishlistState = {
  items: [],
  count: 0,
  isLoading: false,
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setWishlistItems: (state, action: PayloadAction<string[]>) => {
      state.items = action.payload;
      state.count = action.payload.length;
    },
    addToWishlist: (state, action: PayloadAction<string>) => {
      if (!state.items.includes(action.payload)) {
        state.items.push(action.payload);
        state.count = state.items.length;
      }
    },
    removeFromWishlist: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(id => id !== action.payload);
      state.count = state.items.length;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearWishlist: (state) => {
      state.items = [];
      state.count = 0;
    },
  },
});

export const {
  setWishlistItems,
  addToWishlist,
  removeFromWishlist,
  
  
} = wishlistSlice.actions;

export default wishlistSlice.reducer;
