'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import RatingStars from './RatingStars';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface ReviewFormProps {
  productId: string;
  userId: string;
  orderId?: string;
  onSuccess?: () => void;
  existingReview?: {
    reviewId: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
  };
}

export default function ReviewForm({
  productId,
  userId,
  orderId,
  onSuccess,
  existingReview,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [title, setTitle] = useState(existingReview?.title || '');
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(existingReview?.images || []);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length + existingImages.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setImages([...images, ...files]);
    
    // Create preview URLs
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...previewUrls];
    
    URL.revokeObjectURL(previewUrls[index]);
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setImages(newImages);
    setPreviewUrls(newPreviews);
  };

  const removeExistingImage = (index: number) => {
    const newExistingImages = [...existingImages];
    newExistingImages.splice(index, 1);
    setExistingImages(newExistingImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a review');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      
      const reviewData = {
        action: existingReview ? 'update' : 'create',
        productId,
        userId,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        orderId: orderId || undefined,
        images: existingImages,
      };

      if (existingReview) {
        reviewData.action = 'update';
      }

      formData.append('data', JSON.stringify(reviewData));

      // Append new image files
      images.forEach((image, index) => {
        formData.append(`image${index}`, image);
      });

      const url = existingReview
        ? `/api/product/${productId}/review/${existingReview.reviewId}`
        : `/api/product/${productId}/review`;

      const response = await fetch(url, {
        method: existingReview ? 'PUT' : 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.status === 200 || result.status === 201) {
        toast.success(existingReview ? 'Review updated successfully!' : 'Review submitted successfully!');
        
        // Reset form
        if (!existingReview) {
          setRating(0);
          setTitle('');
          setComment('');
          setImages([]);
          setExistingImages([]);
          setPreviewUrls([]);
        }
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {existingReview ? 'Edit Your Review' : 'Write a Review'}
        </h3>
        <p className="text-sm text-gray-600">Share your experience with this product</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <RatingStars rating={rating} onRatingChange={setRating} size="lg" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Review Title (Optional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's most important to know?"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          maxLength={100}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Your Review <span className="text-red-500">*</span>
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us about your experience with this product..."
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[120px]"
          maxLength={1000}
          required
        />
        <p className="text-xs text-gray-500 mt-1">{comment.length}/1000 characters</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Add Photos (Optional)
        </label>
        <div className="space-y-4">
          {/* Existing Images */}
          {existingImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {existingImages.map((img, index) => (
                <div key={`existing-${index}`} className="relative w-20 h-20">
                  <Image
                    src={img}
                    alt={`Review ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New Image Previews */}
          {previewUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previewUrls.map((url, index) => (
                <div key={`preview-${index}`} className="relative w-20 h-20">
                  <Image
                    src={url}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          {images.length + existingImages.length < 5 && (
            <label className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 transition-colors">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Upload Images</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          )}
          <p className="text-xs text-gray-500">Maximum 5 images allowed</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={loading || rating === 0 || !comment.trim()}
          className="bg-green-600 hover:bg-green-700 text-white px-8"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            existingReview ? 'Update Review' : 'Submit Review'
          )}
        </Button>
      </div>
    </form>
  );
}
