import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface ICoupon extends Document {
    couponId: string;
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderValue: number;
    maxDiscount?: number;
    usageLimit?: number;
    usageLimitPerUser: number;
    usedCount: number;
    userUsage: Map<string, number>;
    expiryDate?: Date;
    isActive: boolean;
    applicableProducts: string[];
    applicableCategories: string[];
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
    {
        couponId: {
            type: String,
            default: uuidv4,
            unique: true,
            required: true,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            minlength: 3,
            maxlength: 20,
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        discountType: {
            type: String,
            enum: ['percentage', 'fixed'],
            required: true,
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0,
        },
        minOrderValue: {
            type: Number,
            default: 0,
            min: 0,
        },
        maxDiscount: {
            type: Number,
            default: null,
            min: 0,
        },
        usageLimit: {
            type: Number,
            default: null,
            min: 1,
        },
        usageLimitPerUser: {
            type: Number,
            default: 1,
            min: 1,
        },
        usedCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        userUsage: {
            type: Map,
            of: Number,
            default: {},
        },
        expiryDate: {
            type: Date,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        applicableProducts: {
            type: [String],
            default: [],
        },
        applicableCategories: {
            type: [String],
            default: [],
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

// Index for faster lookups
// `code` is declared with `unique: true` in the schema, so an index already exists.
// Removed explicit `code` index to avoid duplicate index warnings.
couponSchema.index({ isActive: 1, isDeleted: 1 });

const Coupon = mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', couponSchema);

export default Coupon;
export type { ICoupon };
