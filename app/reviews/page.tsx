'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import RatingStars from '@/components/RatingStars';
import ReviewForm from '@/components/ReviewForm';
import { Edit2, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Review {
  _id: string;
  reviewId: string;
  productId: string;
  productTitle?: string;
  productImage?: string;
  rating: number;
  title?: string;
  comment: string;
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyReviews() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (authLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchReviews();
  }, [isAuthenticated, authLoading, router]);

  const fetchReviews = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userId = user.id || user._id;
      const response = await fetch(`/api/product/reviews?userId=${userId}`);
      const result = await response.json();

      if (result.status === 200) {
        setReviews(result.data.reviews || []);
      } else {
        toast.error('Failed to fetch reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) {
      return;
    }

    setDeletingId(reviewId);
    try {
      const review = reviews.find(r => r.reviewId === reviewId);
      if (!review) return;

      const response = await fetch(`/api/product/${review.productId}/review/${reviewId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.status === 200) {
        toast.success('Review deleted successfully');
        setReviews(reviews.filter(r => r.reviewId !== reviewId));
      } else {
        toast.error(result.message || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Show loading state while auth or reviews are loading
  if (authLoading || (loading && isAuthenticated)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-12 h-12 animate-spin text-green-600" />
        </div>
      </div>
    );
  }

  // If not authenticated after loading, don't show anything (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  if (editingReview && user) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => setEditingReview(null)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to My Reviews
        </button>

        <ReviewForm
          productId={editingReview.productId}
          userId={user.id || user._id || ''}
          existingReview={{
            reviewId: editingReview.reviewId,
            rating: editingReview.rating,
            title: editingReview.title,
            comment: editingReview.comment,
            images: editingReview.images,
          }}
          onSuccess={() => {
            setEditingReview(null);
            fetchReviews();
            toast.success('Review updated successfully!');
          }}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Reviews</h1>
        <p className="text-gray-600">Manage your product reviews</p>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">You haven't written any reviews yet.</p>
          <Link href="/products">
            <Button className="bg-green-600 hover:bg-green-700">
              Browse Products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.reviewId} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <RatingStars rating={review.rating} readonly size="md" />
                    {getStatusBadge(review.status)}
                  </div>
                  
                  {review.title && (
                    <h3 className="text-lg font-semibold mb-2">{review.title}</h3>
                  )}
                  
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">{review.comment}</p>

                  {review.images.length > 0 && (
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {review.images.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20">
                          <Image
                            src={img}
                            alt={`Review image ${idx + 1}`}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {review.adminNote && review.status === 'rejected' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <p className="text-sm text-red-800">
                        <strong>Admin Note:</strong> {review.adminNote}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Posted on {formatDate(review.createdAt)}</span>
                    {review.updatedAt !== review.createdAt && (
                      <span>• Updated on {formatDate(review.updatedAt)}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => setEditingReview(review)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(review.reviewId)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={deletingId === review.reviewId}
                  >
                    {deletingId === review.reviewId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>

              {review.productTitle && (
                <div className="border-t pt-4 mt-4">
                  <Link
                    href={`/products/${review.productId}`}
                    className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    {review.productImage && (
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <Image
                          src={review.productImage}
                          alt={review.productTitle}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Product</p>
                      <p className="font-medium text-gray-900">{review.productTitle}</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
