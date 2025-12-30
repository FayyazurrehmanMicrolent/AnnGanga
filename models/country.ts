import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface ICountry extends Document {
  countryId: string;
  countryName: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const countrySchema = new Schema<ICountry>(
  {
    countryId: { type: String, default: uuidv4, unique: true, required: true },
    countryName: { type: String, required: true, trim: true, unique: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

countrySchema.index({ countryId: 1 });
countrySchema.index({ countryName: 1 });

const Country = mongoose.models.Country || mongoose.model<ICountry>('Country', countrySchema);
export default Country;
export type { ICountry };
