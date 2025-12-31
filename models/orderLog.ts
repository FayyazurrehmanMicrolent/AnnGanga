import mongoose, { Schema, Document } from 'mongoose';

interface IOrderLog extends Document {
    orderId: string;
    status: 'Order Placed' | 'Order Confirmed' | 'Order Shipped' | 'Out for Delivery' | 'Order Delivered';
    level: number;
    actor?: string | null; // e.g. 'system', 'admin', 'delivery'
    actorId?: string | null;
    createdAt: Date;
}

const ALLOWED_STATUSES = [
    'Order Placed',
    'Order Confirmed',
    'Order Shipped',
    'Out for Delivery',
    'Order Delivered',
];

const STATUS_LEVEL: Record<string, number> = {
    'Order Placed': 1,
    'Order Confirmed': 2,
    'Order Shipped': 3,
    'Out for Delivery': 4,
    'Order Delivered': 5,
};

function normalizeStatus(input?: string | null): string | null {
    if (!input) return null;
    const s = String(input).trim().toLowerCase();

    // Accept canonical or human forms
    if (s === 'placed' || s === 'order placed') return 'Order Placed';
    if (s === 'confirmed' || s === 'order confirmed') return 'Order Confirmed';
    if (s === 'shipped' || s === 'order shipped' || s === 'dispatched') return 'Order Shipped';
    if (s.includes('out') && s.includes('delivery')) return 'Out for Delivery';
    if (s === 'delivered' || s === 'order delivered') return 'Order Delivered';

    // Try exact match with allowed statuses
    for (const a of ALLOWED_STATUSES) {
        if (a.toLowerCase() === s) return a;
    }
    return null;
}

function getStatusLevel(status: string): number {
    return STATUS_LEVEL[status] || 0;
}

const orderLogSchema = new Schema<IOrderLog>(
    {
        orderId: { type: String, ref: 'Order', required: true, index: true },
        status: { type: String, enum: ALLOWED_STATUSES, required: true },
        level: { type: Number, required: true },
        actor: { type: String, default: 'system' },
        actorId: { type: String, default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Prevent duplicate identical status entries for the same order
orderLogSchema.index({ orderId: 1, status: 1 }, { unique: true });
orderLogSchema.index({ orderId: 1, createdAt: 1 });

const OrderLog = mongoose.models.OrderLog || mongoose.model<IOrderLog>('OrderLog', orderLogSchema);

export default OrderLog;
export type { IOrderLog };
export { normalizeStatus, getStatusLevel, ALLOWED_STATUSES };

// Create a unique log entry (one per orderId+status). Uses upsert to avoid duplicates/races.
async function createUniqueLog(params: {
    orderId: string;
    status: string;
    level: number;
    actor?: string | null;
    actorId?: string | null;
}) {
    const { orderId, status, level, actor = 'system', actorId = null } = params;
    // Use findOneAndUpdate with upsert to ensure a single document per (orderId,status).
    const doc = await OrderLog.findOneAndUpdate(
        { orderId, status },
        {
            $setOnInsert: { level, actor, actorId },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return doc;
}

export { createUniqueLog };
