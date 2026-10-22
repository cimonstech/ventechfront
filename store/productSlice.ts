import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Product, Category, ProductFilter } from '@/types/product';

interface ProductState {
  products: Product[];
  categories: Category[];
  featuredProducts: Product[];
  currentProduct: Product | null;
  filters: ProductFilter;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const initialState: ProductState = {
  products: [],
  categories: [],
  featuredProducts: [],
  currentProduct: null,
  filters: {
    sortBy: 'newest',
    sortOrder: 'desc',
  },
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  },
};

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
      state.isLoading = false;
      state.error = null;
    },

    setCategories: (state, action: PayloadAction<Category[]>) => {
      state.categories = action.payload;
    },

    setFeaturedProducts: (state, action: PayloadAction<Product[]>) => {
      state.featuredProducts = action.payload;
    },

    setCurrentProduct: (state, action: PayloadAction<Product | null>) => {
      state.currentProduct = action.payload;
      state.isLoading = false;
      state.error = null;
    },

    setFilters: (state, action: PayloadAction<Partial<ProductFilter>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetFilters: (state) => {
      state.filters = {
        sortBy: 'newest',
        sortOrder: 'desc',
      };
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    setPagination: (
      state,
      action: PayloadAction<{
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
      }>
    ) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    addProduct: (state, action: PayloadAction<Product>) => {
      state.products.unshift(action.payload);
    },

    updateProduct: (state, action: PayloadAction<Product>) => {
      const index = state.products.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.products[index] = action.payload;
      }
    },

    deleteProduct: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter((p) => p.id !== action.payload);
    },
  },
});

export const {
  
  
  
  
  
  
  
  
  
  
  
  
} = productSlice.actions;

export default productSlice.reducer;


