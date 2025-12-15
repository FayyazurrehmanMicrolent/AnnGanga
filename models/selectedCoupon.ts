import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface ISelectedCoupon extends Document {
  selectionId: string;
  userId: string;
  couponCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const selectedCouponSchema = new Schema<ISelectedCoupon>(
  {
    selectionId: { type: String, default: uuidv4, unique: true, required: true },
    userId: { type: String, ref: 'User', required: true, index: true, unique: true },
    couponCode: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
  }
);

const SelectedCoupon = mongoose.models.SelectedCoupon || mongoose.model<ISelectedCoupon>('SelectedCoupon', selectedCouponSchema);

export default SelectedCoupon;
export type { ISelectedCoupon };
