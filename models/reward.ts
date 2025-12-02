import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IReward extends Document {
    rewardId: string;
    userId: string;
    balance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const rewardSchema = new Schema<IReward>(
    {
        rewardId: {
            type: String,
            default: uuidv4,
            unique: true,
            required: true,
        },
        userId: {
            type: String,
            ref: 'User',
            required: true,
            unique: true,
        },
        balance: {
            type: Number,
            default: 0,
            min: 0,
        },
        lifetimeEarned: {
            type: Number,
            default: 0,
            min: 0,
        },
        lifetimeRedeemed: {
            type: Number,
            default: 0,
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

// Index for faster lookups
// `userId` is declared with `unique: true` above so an index already exists.
// Removing explicit schema.index to prevent duplicate index warnings from Mongoose.

const Reward = mongoose.models.Reward || mongoose.model<IReward>('Reward', rewardSchema);

export default Reward;
export type { IReward };
