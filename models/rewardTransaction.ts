import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IRewardTransaction extends Document {
    transactionId: string;
    rewardId: string;
    userId: string;
    type: 'earned' | 'redeemed' | 'adjusted' | 'expired';
    amount: number;
    orderId?: string;
    description: string;
    balanceAfter: number;
    createdAt: Date;
}

const rewardTransactionSchema = new Schema<IRewardTransaction>(
    {
        transactionId: {
            type: String,
            default: uuidv4,
            unique: true,
            required: true,
        },
        rewardId: {
            type: String,
            ref: 'Reward',
            required: true,
        },
        userId: {
            type: String,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: ['earned', 'redeemed', 'adjusted', 'expired'],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        orderId: {
            type: String,
            ref: 'Order',
            default: null,
        },
        description: {
            type: String,
            required: true,
        },
        balanceAfter: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster lookups
rewardTransactionSchema.index({ rewardId: 1, createdAt: -1 });
rewardTransactionSchema.index({ userId: 1, createdAt: -1 });

const RewardTransaction = mongoose.models.RewardTransaction || mongoose.model<IRewardTransaction>('RewardTransaction', rewardTransactionSchema);

export default RewardTransaction;
export type { IRewardTransaction };
