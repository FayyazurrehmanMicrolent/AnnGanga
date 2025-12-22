import mongoose, { Schema, Document } from 'mongoose';

interface IWishlistItem {
  productId?: string;
  recipeId?: string;
  addedAt: Date;
}

interface IWishlist extends Document {
  userId: string;
  items: IWishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

const wishlistItemSchema = new Schema<IWishlistItem>(
  {
    productId: {
      type: String,
      required: false,
      default: null,
    },
    recipeId: {
      type: String,
      required: false,
      default: null,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const wishlistSchema = new Schema<IWishlist>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: [wishlistItemSchema],
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
wishlistSchema.index({ userId: 1 });
wishlistSchema.index({ 'items.productId': 1 });
wishlistSchema.index({ 'items.recipeId': 1 });

export default mongoose.models.Wishlist || mongoose.model<IWishlist>('Wishlist', wishlistSchema);
