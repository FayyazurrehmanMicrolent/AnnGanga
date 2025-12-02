import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface ISubscriptionItem {
    productId: string;
    quantity: number;
    weightOption?: string;
}

interface ISubscription extends Document {
    subscriptionId: string;
    name: string;
    description?: string;
    items: ISubscriptionItem[];
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    customDays?: number[]; // 0=Sunday, 1=Monday, etc.
    price: number;
    discount: number;
    isInviteOnly: boolean;
    isActive: boolean;
    image?: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const subscriptionItemSchema = new Schema<ISubscriptionItem>(
    {
        productId: { type: String, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        weightOption: { type: String, default: null },
    },
    { _id: false }
);

const subscriptionSchema = new Schema<ISubscription>(
    {
        subscriptionId: {
            type: String,
            default: uuidv4,
            unique: true,
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: null,
        },
        items: {
            type: [subscriptionItemSchema],
            required: true,
            validate: {
                validator: (items: ISubscriptionItem[]) => items.length > 0,
                message: 'Subscription must have at least one item',
            },
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'custom'],
            required: true,
        },
        customDays: {
            type: [Number],
            default: [],
            validate: {
                validator: function (days: number[]) {
                    // If frequency is custom, days must be provided and valid (0-6)
                    // @ts-ignore
                    if (this.frequency === 'custom') {
                        return days.length > 0 && days.every((d) => d >= 0 && d <= 6);
                    }
                    return true;
                },
                message: 'Custom days must be valid (0-6) when frequency is custom',
            },
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
        },
        isInviteOnly: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        image: {
            type: String,
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

// Indexes
subscriptionSchema.index({ isActive: 1, isDeleted: 1 });

const Subscription = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', subscriptionSchema);

export default Subscription;
export type { ISubscription, ISubscriptionItem };
