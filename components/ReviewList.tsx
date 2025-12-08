'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import RatingStars from './RatingStars';
import { ThumbsUp, VerifiedIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';

interface Review {
  _id: string;
  reviewId: string;
  userId: string;
  userName: string;
  userImage?: string;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  breakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface ReviewListProps {
  productId: string;
  refreshTrigger?: number;
}

export default function ReviewList({ productId, refreshTrigger = 0 }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReviews(1, filter);
  }, [productId, filter, refreshTrigger]);

  const fetchReviews = async (pageNum: number, ratingFilter: number | 'all' = 'all') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
      });

      if (ratingFilter !== 'all') {
        params.append('rating', ratingFilter.toString());
      }

      const response = await fetch(`/api/product/${productId}/review?${params}`);
      const result = await response.json();

      if (result.status === 200) {
        if (pageNum === 1) {
          setReviews(result.data.reviews);
        } else {
          setReviews([...reviews, ...result.data.reviews]);
        }
        setStats(result.data.stats);
        setHasMore(result.data.pagination.page < result.data.pagination.pages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    fetchReviews(page + 1, filter);
  };

  const toggleExpanded = (reviewId: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReviews(newExpanded);
  };

  const getPercentage = (count: number) => {
    if (!stats || stats.totalReviews === 0) return 0;
    return (count / stats.totalReviews) * 100;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading && page === 1) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Rating Overview */}
      {stats && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-2xl font-bold mb-4">Customer Reviews</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Overall Rating */}
            <div className="flex flex-col items-center justify-center border-r">
              <div className="text-5xl font-bold mb-2">{stats.averageRating.toFixed(1)}</div>
              <RatingStars rating={stats.averageRating} readonly size="lg" />
              <p className="text-gray-600 mt-2">Based on {stats.totalReviews} reviews</p>
            </div>

            {/* Rating Breakdown */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFilter(filter === rating ? 'all' : rating)}
                  className={`flex items-center gap-3 w-full hover:bg-gray-50 p-2 rounded transition-colors ${
                    filter === rating ? 'bg-green-50' : ''
                  }`}
                >
                  <span className="text-sm font-medium w-12">{rating} star</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all duration-300"
                      style={{ width: `${getPercentage(stats.breakdown[rating as keyof typeof stats.breakdown])}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {stats.breakdown[rating as keyof typeof stats.breakdown]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Reset */}
          {filter !== 'all' && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setFilter('all')}
                className="text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Show all reviews
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          reviews.map((review) => {
            const isExpanded = expandedReviews.has(review.reviewId);
            const shouldTruncate = review.comment.length > 300;

            return (
              <div key={review.reviewId} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    {review.userImage ? (
                      <Image
                        src={review.userImage}
                        alt={review.userName}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-semibold text-lg">
                          {review.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Review Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{review.userName}</span>
                      {review.isVerifiedPurchase && (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          <VerifiedIcon className="w-3 h-3" />
                          Verified Purchase
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <RatingStars rating={review.rating} readonly size="sm" />
                      <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
                    </div>

                    {review.title && (
                      <h4 className="font-semibold mb-2">{review.title}</h4>
                    )}

                    <p className="text-gray-700 whitespace-pre-wrap">
                      {shouldTruncate && !isExpanded
                        ? `${review.comment.substring(0, 300)}...`
                        : review.comment}
                    </p>

                    {shouldTruncate && (
                      <button
                        onClick={() => toggleExpanded(review.reviewId)}
                        className="text-green-600 hover:text-green-700 text-sm font-medium mt-2 flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>
                            Show less <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Read more <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    )}

                    {/* Review Images */}
                    {review.images.length > 0 && (
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {review.images.map((img, idx) => (
                          <div key={idx} className="relative w-20 h-20">
                            <Image
                              src={img}
                              alt={`Review image ${idx + 1}`}
                              fill
                              className="object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(img, '_blank')}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="text-center pt-4">
            <Button
              onClick={loadMore}
              disabled={loading}
              variant="outline"
              className="px-8"
            >
              {loading ? 'Loading...' : 'Load More Reviews'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
