import { supabase } from '@/lib/supabase';
import { Review } from '@/types/review';

export interface CreateReviewData {
  product_id: string;
  rating: number;
  title?: string;
  comment?: string;
}

export interface UpdateReviewData {
  rating?: number;
  title?: string;
  comment?: string;
}

// Get reviews for a product
export const getProductReviews = async (productId: string): Promise<Review[]> => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        user:users!reviews_user_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching product reviews:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch product reviews:', error);
    return [];
  }
};

// Get user's review for a product
export const getUserReview = async (productId: string): Promise<Review | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No review found
        return null;
      }
      console.error('Error fetching user review:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch user review:', error);
    return null;
  }
};

// Create a new review
export const createReview = async (reviewData: CreateReviewData): Promise<Review | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to create a review');
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        ...reviewData,
        user_id: user.id,
        is_verified_purchase: true, // You can implement purchase verification logic
        is_approved: true // Auto-approve for now, can be changed to false for moderation
      })
      .select(`
        *,
        user:users!reviews_user_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating review:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to create review:', error);
    throw error;
  }
};

// Update a review
export const updateReview = async (reviewId: string, reviewData: UpdateReviewData): Promise<Review | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to update a review');
    }

    const { data, error } = await supabase
      .from('reviews')
      .update({
        ...reviewData,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .eq('user_id', user.id) // Ensure user can only update their own review
      .select(`
        *,
        user:users!reviews_user_id_fkey(
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error updating review:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update review:', error);
    throw error;
  }
};

// Delete a review
export const deleteReview = async (reviewId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User must be authenticated to delete a review');
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id); // Ensure user can only delete their own review

    if (error) {
      console.error('Error deleting review:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete review:', error);
    throw error;
  }
};

// Get review statistics for a product
export const getReviewStats = async (productId: string) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('is_approved', true);

    if (error) {
      console.error('Error fetching review stats:', error);
      throw error;
    }

    const reviews = data || [];
    const totalReviews = reviews.length;
    
    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
    
    const ratingDistribution = reviews.reduce((dist, review) => {
      dist[review.rating as keyof typeof dist] = (dist[review.rating as keyof typeof dist] || 0) + 1;
      return dist;
    }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews,
      ratingDistribution
    };
  } catch (error) {
    console.error('Failed to fetch review stats:', error);
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }
};

// Admin: Get all reviews (including unapproved)
export const getAllReviews = async (): Promise<Review[]> => {
  try {
    // Try with generic foreign key reference (without specific constraint name)
    let { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        user:user_id(
          id,
          first_name,
          last_name,
          full_name,
          avatar_url,
          email
        ),
        product:product_id(
          id,
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    // If that fails, try without joins
    if (error) {
      console.warn('Error with joins, trying simple query:', error);
      const simpleResult = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (simpleResult.error) {
        console.error('Error fetching all reviews:', simpleResult.error);
        throw simpleResult.error;
      }
      
      return simpleResult.data || [];
    }
    
    return data || [];
  } catch (error: any) {
    console.error('Failed to fetch all reviews:', error);
    // Return empty array on error to prevent UI breakage
    return [];
  }
};

// Admin: Delete any review
export const adminDeleteReview = async (reviewId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      console.error('Error deleting review:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to delete review:', error);
    throw error;
  }
};

// Export as object for convenience
export const reviewsService = {
  getProductReviews,
  getUserReview,
  createReview,
  updateReview,
  deleteReview,
  getReviewStats,
  getAllReviews, // Admin only
  adminDeleteReview, // Admin only
};

