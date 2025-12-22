import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IDelivery extends Document {
  deliveryId: string;
  name: string; // delivery name / carrier name
  userId: string;
  orderId?: string; // links to Order.orderId or order summary identifier
  price?: number;
  currency?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const deliverySchema = new Schema<IDelivery>(
  {
    deliveryId: { type: String, default: uuidv4, unique: true, required: true },
    name: { type: String, required: true },
    userId: { type: String, ref: 'User', required: true },
    orderId: { type: String, ref: 'Order', default: null },
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

deliverySchema.index({ deliveryId: 1 });
deliverySchema.index({ userId: 1 });
deliverySchema.index({ orderId: 1 });

const Delivery = mongoose.models.Delivery || mongoose.model<IDelivery>('Delivery', deliverySchema);

export default Delivery;
export type { IDelivery };
