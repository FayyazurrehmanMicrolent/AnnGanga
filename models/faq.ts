import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IFaq extends Document {
  faqId: string;
  productId: string;
  question: string;
  answer: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFaq>(
  {
    faqId: { type: String, default: uuidv4, unique: true, required: true },
    productId: { type: String, ref: 'Product', required: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const Faq = mongoose.models.Faq || mongoose.model<IFaq>('Faq', faqSchema);

export default Faq;
export type { IFaq };
