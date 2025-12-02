import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IUserSubscription extends Document {
    userSubscriptionId: string;
    userId: string;
    subscriptionId: string;
    addressId: string;
    startDate: Date;
    endDate?: Date;
    nextDeliveryDate: Date;
    status: 'active' | 'paused' | 'cancelled' | 'expired';
    paymentMethod: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const userSubscriptionSchema = new Schema<IUserSubscription>(
    {
        userSubscriptionId: {
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
        subscriptionId: {
            type: String,
            ref: 'Subscription',
            required: true,
        },
        addressId: {
            type: String,
            ref: 'Address',
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        endDate: {
            type: Date,
            default: null,
        },
        nextDeliveryDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ['active', 'paused', 'cancelled', 'expired'],
            default: 'active',
        },
        paymentMethod: {
            type: String,
            required: true,
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

// Indexes
userSubscriptionSchema.index({ userId: 1, status: 1 });
userSubscriptionSchema.index({ nextDeliveryDate: 1, status: 1 }); // For cron jobs

const UserSubscription = mongoose.models.UserSubscription || mongoose.model<IUserSubscription>('UserSubscription', userSubscriptionSchema);

export default UserSubscription;
export type { IUserSubscription };
