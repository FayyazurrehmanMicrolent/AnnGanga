import mongoose, { Schema, Document } from 'mongoose';
import OrderLog, { normalizeStatus, getStatusLevel, createUniqueLog } from '@/models/orderLog';
import { v4 as uuidv4 } from 'uuid';

interface IOrderItem {
    productId: string;
    productName: string;
    quantity: number;
    weightOption?: string;
    price: number;
    total: number;
}

interface IDeliveryAddress {
    name: string;
    phone: string;
    address: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
}

interface IOrder extends Document {
    orderId: string;
    userId: string;
    items: IOrderItem[];
    subtotal: number;
    discount: number;
    deliveryId?: string;
    deliveryCharges: number;
    total: number;
    couponCode?: string;
    rewardPointsUsed: number;
    rewardDiscount: number;
    paymentMethod: string;
    paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
    deliveryAddress: IDeliveryAddress;
    deliveryType: 'normal' | 'expedited';
    orderStatus: 'pending' | 'confirmed' | 'packed' | 'dispatched' | 'delivered' | 'cancelled';
    estimatedDelivery?: Date;
    orderSummaryId?: string;
    deliveryPartnerId?: string;
    trackingUrl?: string;
    trackingId?: string;
    cancelReason?: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
    {
        productId: { type: String, ref: 'Product', required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        weightOption: { type: String, default: null },
        price: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const deliveryAddressSchema = new Schema<IDeliveryAddress>(
    {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        landmark: { type: String, default: null },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
    },
    { _id: false }
);

const orderSchema = new Schema<IOrder>(
    {
        orderId: {
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
        items: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: (items: IOrderItem[]) => items.length > 0,
                message: 'Order must have at least one item',
            },
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
        },
        deliveryCharges: {
            type: Number,
            default: 0,
            min: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
        couponCode: {
            type: String,
            default: null,
        },
        rewardPointsUsed: {
            type: Number,
            default: 0,
            min: 0,
        },
        rewardDiscount: {
            type: Number,
            default: 0,
            min: 0,
        },
        paymentMethod: {
            type: String,
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending',
        },
        deliveryAddress: {
            type: deliveryAddressSchema,
            required: false,
            default: null,
        },
        deliveryId: {
            type: String,
            ref: 'Delivery',
            default: null,
        },
        deliveryType: {
            type: String,
            enum: ['normal', 'expedited'],
            default: 'normal',
        },
        orderStatus: {
            type: String,
            enum: ['pending', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled'],
            default: 'pending',
        },
        estimatedDelivery: {
            type: Date,
            default: null,
        },
            orderSummaryId: {
                type: String,
                default: null,
            },
        deliveryPartnerId: {
            type: String,
            default: null,
        },
        trackingUrl: {
            type: String,
            default: null,
        },
        trackingId: {
            type: String,
            default: null,
        },
        cancelReason: {
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

// Indexes for faster lookups
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ orderSummaryId: 1 });
// orderId has `unique: true` in the schema definition, so an index is already created.
// Removed explicit index to avoid duplicate index warnings.

const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);

// Middleware: whenever orderStatus changes, create a new OrderLog entry.
orderSchema.pre('save', async function (next) {
    try {
        // `this` is the document
        if (this.isModified && this.isModified('orderStatus')) {
            const normalized = normalizeStatus(String(this.orderStatus));
            if (normalized) {
                const level = getStatusLevel(normalized);
                try {
                    await createUniqueLog({ orderId: this.orderId, status: normalized, level, actor: 'system', actorId: null });
                } catch (e) {
                    console.warn('Failed to create OrderLog in pre-save:', e);
                }
            }
        }
    } catch (e) {
        // ignore
    }
    next();
});

// Post hook for findOneAndUpdate flows (covers direct query updates)
orderSchema.post('findOneAndUpdate', async function (doc: any) {
    try {
        if (doc && doc.orderStatus) {
            const normalized = normalizeStatus(String(doc.orderStatus));
            if (normalized) {
                const level = getStatusLevel(normalized);
                try {
                    await createUniqueLog({ orderId: doc.orderId, status: normalized, level, actor: 'system', actorId: null });
                } catch (e: any) {
                    // ignore duplicate key errors or log otherwise
                    console.warn('Failed to create OrderLog in post-findOneAndUpdate:', e);
                }
            }
        }
    } catch (e) {
        // ignore
    }
});

export default Order;
export type { IOrder, IOrderItem, IDeliveryAddress };
