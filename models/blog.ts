import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IBlog extends Document {
  blogId: string;
  title: string;
  content: string;
  excerpt?: string;
  images: string[];
  productLinks?: string[]; // Array of productIds
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
      type: [String],
      ref: 'Product',
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

const Blog = mongoose.models.Blog || mongoose.model<IBlog>('Blog', blogSchema);

export default Blog;
export type { IBlog };
