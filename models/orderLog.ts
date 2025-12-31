import mongoose, { Schema, Document } from 'mongoose';

interface IOrderLog extends Document {
    orderId: string;
    status: string;
    actor?: string | null; // e.g. 'system', 'admin', 'delivery'
    actorId?: string | null;
    createdAt: Date;
}

const orderLogSchema = new Schema<IOrderLog>(
    {
        orderId: { type: String, ref: 'Order', required: true, index: true },
        status: { type: String, required: true },
        actor: { type: String, default: 'system' },
        actorId: { type: String, default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

orderLogSchema.index({ orderId: 1, createdAt: 1 });

const OrderLog = mongoose.models.OrderLog || mongoose.model<IOrderLog>('OrderLog', orderLogSchema);

export default OrderLog;
export type { IOrderLog };
