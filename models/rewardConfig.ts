import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IRewardConfig extends Document {
    configId: string;
    name: string;
    pointsPerOrder: number;
    pointsPerRupee: number;
    minOrderForReward: number;
    redemptionRate: number;
    minRedemptionPoints: number;
    maxRedemptionPercent: number;
    eligibilityAfterOrders: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const rewardConfigSchema = new Schema<IRewardConfig>(
    {
        configId: {
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
        pointsPerOrder: {
            type: Number,
            default: 10,
            min: 0,
        },
        pointsPerRupee: {
            type: Number,
            default: 1,
            min: 0,
        },
        minOrderForReward: {
            type: Number,
            default: 500,
            min: 0,
        },
        redemptionRate: {
            type: Number,
            default: 10,
            min: 1,
        },
        minRedemptionPoints: {
            type: Number,
            default: 100,
            min: 0,
        },
        maxRedemptionPercent: {
            type: Number,
            default: 50,
            min: 0,
            max: 100,
        },
        eligibilityAfterOrders: {
            type: Number,
            default: 1,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for active config lookup
rewardConfigSchema.index({ isActive: 1 });

const RewardConfig = mongoose.models.RewardConfig || mongoose.model<IRewardConfig>('RewardConfig', rewardConfigSchema);

export default RewardConfig;
export type { IRewardConfig };
