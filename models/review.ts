import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IReview extends Document {
    reviewId: string;
    userId: string;
    productId: string;
    orderId?: string;
    rating: number;
    title?: string;
    comment?: string;
    images: string[];
    isVerifiedPurchase: boolean;
    status: 'pending' | 'approved' | 'rejected';
    adminNote?: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
    {
        reviewId: {
            type: String,
            default: uuidv4,
            unique: true,
            required: true,
        },
        userId: {
            type: String,
            ref: 'User',
            required: true,
        },
        productId: {
            type: String,
            ref: 'Product',
            required: true,
        },
        orderId: {
            type: String,
            ref: 'Order',
            default: null,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        title: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },
        images: {
            type: [String],
            default: [],
        },
        isVerifiedPurchase: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        adminNote: {
            type: String,
            trim: true,
            default: null,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster lookups
reviewSchema.index({ productId: 1, status: 1, isDeleted: 1 });
reviewSchema.index({ userId: 1, isDeleted: 1 });
reviewSchema.index({ status: 1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model<IReview>('Review', reviewSchema);

export default Review;
export type { IReview };
