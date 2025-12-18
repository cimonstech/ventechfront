'use client';

import React, { useState, useEffect } from 'react';
import { Star, StarHalf, User, Calendar, CheckCircle } from 'lucide-react';
import { Review, ReviewStats } from '@/types/review';
import { reviewsService } from '@/services/reviews.service';
import { Button } from '@/components/ui/Button';
import { useAppSelector } from '@/store';

interface ReviewsProps {
  productId: string;
  onReviewUpdate?: () => void;
}

export const Reviews: React.FC<ReviewsProps> = ({ productId, onReviewUpdate }) => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    title: '',
    comment: ''
  });

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const [reviewsData, statsData, userReviewData] = await Promise.all([
        reviewsService.getProductReviews(productId),
        reviewsService.getReviewStats(productId),
        isAuthenticated ? reviewsService.getUserReview(productId) : Promise.resolve(null)
      ]);
      
      setReviews(reviewsData);
      setStats(statsData);
      setUserReview(userReviewData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;

    try {
      await reviewsService.createReview({
        product_id: productId,
        rating: newReview.rating,
        title: newReview.title,
        comment: newReview.comment
      });

      // Refresh reviews
      await fetchReviews();
      
      // Notify parent component to update rating/review count
      if (onReviewUpdate) {
        onReviewUpdate();
      }
      
      // Reset form
      setNewReview({ rating: 5, title: '', comment: '' });
      setShowReviewForm(false);
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reviews Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-[#1A1A1A]">
          Reviews ({stats?.totalReviews || 0})
        </h3>
        {isAuthenticated && !userReview && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReviewForm(true)}
          >
            Write a Review
          </Button>
        )}
      </div>

      {/* Review Stats */}
      {stats && stats.totalReviews > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#1A1A1A]">
                {stats.averageRating}
              </div>
              <div className="flex items-center justify-center gap-1 mt-1">
                {renderStars(Math.round(stats.averageRating), 'lg')}
              </div>
              <div className="text-sm text-[#3A3A3A] mt-1">
                Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
              </div>
            </div>
            
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-8">{rating}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#FF7A19] h-2 rounded-full"
                      style={{
                        width: `${stats.totalReviews > 0 ? (stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution] / stats.totalReviews) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-[#3A3A3A] w-8 text-right">
                    {stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Review Form */}
      {showReviewForm && isAuthenticated && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="text-lg font-semibold text-[#1A1A1A] mb-4">Write a Review</h4>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Rating *
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReview({ ...newReview, rating: star })}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= newReview.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Title
              </label>
              <input
                type="text"
                value={newReview.title}
                onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                placeholder="Summarize your experience"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Comment
              </label>
              <textarea
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
                placeholder="Share your thoughts about this product"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" variant="primary" size="sm">
                Submit Review
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowReviewForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-[#FF7A19] rounded-full flex items-center justify-center text-white font-semibold">
                  {review.user?.first_name?.[0] || 'U'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[#1A1A1A]">
                      {review.user?.first_name} {review.user?.last_name}
                    </span>
                    {review.is_verified_purchase && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#3A3A3A]">
                    {renderStars(review.rating, 'sm')}
                    <span>•</span>
                    <span>{formatDate(review.created_at)}</span>
                  </div>
                </div>
              </div>

              {review.title && (
                <h5 className="font-semibold text-[#1A1A1A] mb-2">{review.title}</h5>
              )}

              {review.comment && (
                <p className="text-[#3A3A3A] leading-relaxed">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-[#1A1A1A] mb-2">No reviews yet</h4>
          <p className="text-[#3A3A3A] mb-4">Be the first to review this product!</p>
          {isAuthenticated && (
            <Button
              variant="primary"
              onClick={() => setShowReviewForm(true)}
            >
              Write a Review
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

