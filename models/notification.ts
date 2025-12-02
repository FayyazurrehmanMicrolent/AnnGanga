import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface INotification extends Document {
    notificationId: string;
    userId: string;
    type: 'order' | 'delivery' | 'offer' | 'subscription' | 'reward' | 'general';
    title: string;
    message: string;
    data?: any;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        notificationId: {
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
        type: {
            type: String,
            enum: ['order', 'delivery', 'offer', 'subscription', 'reward', 'general'],
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        data: {
            type: Schema.Types.Mixed,
            default: null,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster lookups
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
export type { INotification };
