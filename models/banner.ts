import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IBanner extends Document {
  bannerId: string;
  title?: string;
  textColor?: string;
  textAlignment?: string;
  position?: string;
  bannerType?: string;
  isActive: boolean;
  priority?: number;
  startDate?: Date | null;
  endDate?: Date | null;
  images: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<IBanner>(
  {
    bannerId: { type: String, default: uuidv4, unique: true, required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    textColor: { type: String, default: '#000000' },
    textAlignment: { type: String, default: 'center' },
    position: { type: String, default: 'top-left' },
    bannerType: { type: String, default: 'generic' },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    images: { type: [String], default: [] },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Banner = mongoose.models.Banner || mongoose.model<IBanner>('Banner', bannerSchema);

export default Banner;
export type { IBanner };
