'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Star, 
  Trash2, 
  Search,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { reviewsService } from '@/services/reviews.service';
import { Review } from '@/types/review';
import { useAppSelector } from '@/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

interface ReviewWithDetails extends Review {
  user?: {
    id: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  product?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function AdminReviewsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterApproved, setFilterApproved] = useState<'all' | 'approved' | 'unapproved'>('all');

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchReviews();
  }, [isAuthenticated, user, router]);

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const allReviews = await reviewsService.getAllReviews();
      setReviews(allReviews as ReviewWithDetails[]);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to fetch reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      await reviewsService.adminDeleteReview(reviewId);
      toast.success('Review deleted successfully');
      fetchReviews(); // Refresh list
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast.error(error.message || 'Failed to delete review');
    }
  };

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch = 
      review.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterApproved === 'all' ||
      (filterApproved === 'approved' && review.is_approved) ||
      (filterApproved === 'unapproved' && !review.is_approved);
    
    return matchesSearch && matchesFilter;
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF7A19]"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Product Reviews</h1>
        <p className="text-sm text-[#3A3A3A]">Manage and moderate customer reviews</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by product, customer, or review content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterApproved}
              onChange={(e) => setFilterApproved(e.target.value as 'all' | 'approved' | 'unapproved')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF7A19] focus:border-transparent"
            >
              <option value="all">All Reviews</option>
              <option value="approved">Approved Only</option>
              <option value="unapproved">Unapproved Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No reviews found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReviews.map((review) => {
              const userName = review.user?.full_name || 
                `${review.user?.first_name || ''} ${review.user?.last_name || ''}`.trim() ||
                review.user?.email ||
                'Anonymous';
              
              return (
                <div key={review.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-4">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      {review.user?.avatar_url ? (
                        <Image
                          src={review.user.avatar_url}
                          alt={userName}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#FF7A19] rounded-full flex items-center justify-center text-white font-semibold">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Review Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-[#1A1A1A] text-sm">{userName}</p>
                            {review.is_verified_purchase && (
                              <Badge variant="success" size="sm">Verified Purchase</Badge>
                            )}
                            {review.is_approved ? (
                              <Badge variant="success" size="sm">Approved</Badge>
                            ) : (
                              <Badge variant="warning" size="sm">Pending</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            {renderStars(review.rating)}
                            <span className="text-xs text-gray-500">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Product Link */}
                      {review.product && (
                        <Link
                          href={`/product/${review.product.slug}`}
                          className="text-xs text-[#FF7A19] hover:underline mb-2 inline-block"
                        >
                          {review.product.name}
                        </Link>
                      )}

                      {/* Review Title */}
                      {review.title && (
                        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">{review.title}</h3>
                      )}

                      {/* Review Comment */}
                      {review.comment && (
                        <p className="text-sm text-[#3A3A3A] mb-3">{review.comment}</p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-700"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-[#3A3A3A] mb-1">Total Reviews</p>
          <p className="text-2xl font-bold text-[#1A1A1A]">{reviews.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-[#3A3A3A] mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-600">
            {reviews.filter(r => r.is_approved).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-[#3A3A3A] mb-1">Pending</p>
          <p className="text-2xl font-bold text-orange-600">
            {reviews.filter(r => !r.is_approved).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-[#3A3A3A] mb-1">Average Rating</p>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {reviews.length > 0 
              ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
              : '0.0'
            }
          </p>
        </div>
      </div>
    </div>
  );
}

