'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Star } from 'lucide-react';
import { reviewsService } from '@/services/reviews.service';
import { Review } from '@/types/review';
import { useAppSelector } from '@/store';
import { hasAdminEntry } from '@/lib/roles';
import { useAccess } from '@/context/AccessContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AccessDenied, EmptyState, ErrorState, NoResults, TableSkeleton, UpdatingNotice } from '@/components/ui-states';
import {
  AdminPageHeader,
  AdminRowCard,
  ConfirmDialog,
  FilterBar,
  filterSelectClassName,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { useListQuery } from '@/hooks/useListQuery';

interface ReviewWithDetails extends Omit<Review, 'user'> {
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

function reviewerName(review: ReviewWithDetails): string {
  return (
    review.user?.full_name ||
    `${review.user?.first_name || ''} ${review.user?.last_name || ''}`.trim() ||
    review.user?.email ||
    'Anonymous'
  );
}

export default function AdminReviewsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { canEdit } = useAccess();
  const canEditProducts = canEdit('products');
  const query = useListQuery();
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterApproved, setFilterApproved] = useState<'all' | 'approved' | 'unapproved'>('all');
  const [deleteTarget, setDeleteTarget] = useState<ReviewWithDetails | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !hasAdminEntry(user?.role)) {
      router.push('/');
      return;
    }
    fetchReviews();
  }, [isAuthenticated, user, router]);

  const fetchReviews = async () => {
    await query.run(async () => {
      setReviews((await reviewsService.getAllReviews()) as ReviewWithDetails[]);
    });
  };

  const handleDeleteReview = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await reviewsService.adminDeleteReview(deleteTarget.id);
      toast.success('Review deleted successfully');
      setDeleteTarget(null);
      fetchReviews();
    } catch (error: any) {
      console.error('Error deleting review:', error);
      toast.error(error.message || 'Failed to delete review');
    } finally {
      setDeleting(false);
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

  const reviewName = (review: ReviewWithDetails) => review.product?.name || reviewerName(review);

  const reviewActions = (review: ReviewWithDetails) => [
    ...(review.product?.slug
      ? [{ label: 'View', href: `/product/${review.product.slug}`, target: '_blank' }]
      : []),
    ...(canEditProducts
      ? [{ label: 'Delete', destructive: true, onClick: () => setDeleteTarget(review) }]
      : []),
  ];

  const reviewStatus = (review: ReviewWithDetails) => (
    <div className="flex flex-wrap items-center gap-1">
      {review.is_verified_purchase ? (
        <Badge variant="success" size="sm">Verified Purchase</Badge>
      ) : null}
      {review.is_approved ? (
        <Badge variant="success" size="sm">Approved</Badge>
      ) : (
        <Badge variant="warning" size="sm">Pending</Badge>
      )}
    </div>
  );

  if (query.forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Go back', href: '/admin' }}
      />
    );
  }

  if (query.error && !query.loaded) {
    return (
      <ErrorState
        title="We couldn't load reviews"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void fetchReviews() }}
      />
    );
  }

  if (query.loading && !query.loaded) {
    return <TableSkeleton />;
  }

  return (
    <div className="min-w-0">
      {query.updating ? <UpdatingNotice /> : null}
      <AdminPageHeader
        title="Reviews"
        subtitle={`${reviews.length} review${reviews.length === 1 ? '' : 's'}`}
      />

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search reviews"
        activeCount={filterApproved === 'all' ? 0 : 1}
        onClear={() => setFilterApproved('all')}
      >
        <select
          value={filterApproved}
          onChange={(e) => setFilterApproved(e.target.value as 'all' | 'approved' | 'unapproved')}
          className={filterSelectClassName()}
        >
          <option value="all">All reviews</option>
          <option value="approved">Approved only</option>
          <option value="unapproved">Unapproved only</option>
        </select>
      </FilterBar>

      {filteredReviews.length === 0 ? (
        searchQuery || filterApproved !== 'all' ? (
          <NoResults
            primary={{
              label: 'Clear filters',
              onClick: () => {
                setSearchQuery('');
                setFilterApproved('all');
              },
            }}
          />
        ) : (
          <EmptyState title="No reviews yet" description="Customer reviews will show up here." />
        )
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={filteredReviews.map((review) => (
            <AdminRowCard
              key={review.id}
              name={reviewName(review)}
              status={reviewStatus(review)}
              facts={[
                { label: 'Rating', value: renderStars(review.rating) },
                { label: 'Date', value: new Date(review.created_at).toLocaleDateString() },
              ]}
              actions={<RowActions name={reviewName(review)} actions={reviewActions(review)} />}
            />
          ))}
        >
          {filteredReviews.map((review) => (
            <tr key={review.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium text-[#1A1A1A]">{reviewerName(review)}</p>
                {review.title ? (
                  <p className="text-sm font-semibold text-[#1A1A1A]">{review.title}</p>
                ) : null}
                {review.comment ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[#3A3A3A]">{review.comment}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-[#1A1A1A]">{review.product?.name || '—'}</td>
              <td className="px-4 py-3">{renderStars(review.rating)}</td>
              <td className="px-4 py-3 text-[#3A3A3A]">
                {new Date(review.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">{reviewStatus(review)}</td>
              <td className="px-4 py-3 text-right">
                <RowActions name={reviewName(review)} actions={reviewActions(review)} />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Total Reviews</p>
          <p className="text-2xl font-bold text-[#1A1A1A]">{reviews.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Approved</p>
          <p className="text-2xl font-bold text-green-600">
            {reviews.filter((r) => r.is_approved).length}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Pending</p>
          <p className="text-2xl font-bold text-orange-600">
            {reviews.filter((r) => !r.is_approved).length}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-1 text-sm text-[#3A3A3A]">Average Rating</p>
          <p className="text-2xl font-bold text-[#1A1A1A]">
            {reviews.length > 0
              ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
              : '0.0'}
          </p>
        </div>
      </div>

      {deleteTarget ? (
        <ConfirmDialog
          title="Delete this review?"
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleDeleteReview()}
        >
          This review will be removed. This cannot be undone.
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
