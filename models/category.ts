import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface ICategory extends Document {
  categoryId: string;
  name: string;
  image?: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    categoryId: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
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

// Note: nameLower and its index were removed; uniqueness is enforced case-insensitively
// at the application level in the category route using a regex match.

const Category = mongoose.models.Category || mongoose.model<ICategory>('Category', categorySchema);

export default Category;
export type { ICategory };
