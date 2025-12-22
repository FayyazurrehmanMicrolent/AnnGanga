import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IProductLink {
  productId: string;
  title?: string | null;
  image?: string | null;
  weight?: string | null;
  mrp?: number | null;
  actualPrice?: number | null;
  discountPercentage?: number | null;
}

interface IBlog extends Document {
  blogId: string;
  title: string;
  content: string;
  excerpt?: string;
  images: string[];
  productLinks?: IProductLink[]; // Array of product subdocuments
  author?: string;
  publishedDate?: Date;
  tags?: string[];
  isPublished: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>(
  {
    blogId: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      trim: true,
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },
    productLinks: {
      type: [
        new Schema(
          {
            productId: { type: String, ref: 'Product', required: true },
            title: { type: String, default: null },
            image: { type: String, default: null },
            weight: { type: String, default: null },
            mrp: { type: Number, default: null },
            actualPrice: { type: Number, default: null },
            discountPercentage: { type: Number, default: null },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    author: {
      type: String,
      default: null,
    },
    publishedDate: {
      type: Date,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    isPublished: {
      type: Boolean,
      default: false,
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

// Ensure model is recompiled in dev/hot-reload environments
if (mongoose.models.Blog) {
  delete mongoose.models.Blog;
}

const Blog = mongoose.model<IBlog>('Blog', blogSchema);

export default Blog;
export type { IBlog, IProductLink };
