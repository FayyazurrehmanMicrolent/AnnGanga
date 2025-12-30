import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IWeightPrice {
  weight: string;
  price: number;
  quantity?: number;
}

interface INutrition {
  // flexible shape to allow JSON entries like { name, weight, value }
  name?: string;
  weight?: string;
  value?: string;
  // legacy field
  info?: string | Record<string, string>;
}

interface IProduct extends Document {
  productId: string;
  title: string;
  mrp: number;
  actualPrice: number;
  weightVsPrice: IWeightPrice[];
  nutrition: INutrition[];
  vitamins?: string[];
  delivery?: string[];
  tags?: string[];
  dietary?: string[];
  healthBenefits?: string | null;
  description?: string | null;
  images: string[]; 
  categoryId?: string | null;
  frequentlyBoughtTogether?: string[]; 
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const weightPriceSchema = new Schema<IWeightPrice>(
  {
    weight: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: false, default: 1 },
  },
  { _id: false }
);

// allow nutrition entries to be flexible JSON or legacy { weight, info } shape
const nutritionSchema = new Schema<INutrition>(
  {
    // use Mixed so we accept object shapes that admins may send
    // individual fields are optional to preserve flexibility
    name: { type: String, required: false },
    weight: { type: String, required: false },
    value: { type: String, required: false },
    info: { type: Schema.Types.Mixed, required: false },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    productId: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
    },
    title: { type: String, required: true, trim: true },
    mrp: { type: Number, required: true },
    actualPrice: { type: Number, required: true },
    weightVsPrice: { type: [weightPriceSchema], default: [] },
    nutrition: { type: [nutritionSchema], default: [] },
    vitamins: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    delivery: { type: [String], default: [] },
    dietary: { type: [String], default: [] },
    healthBenefits: { type: String, default: null },
    description: { type: String, default: null },
    images: { type: [String], default: [] },
    categoryId: { type: String, ref: 'Category', default: null },
    frequentlyBoughtTogether: { type: [String], ref: 'Product', default: [] },
    isDeleted: { type: Boolean, default: false },
    isLike: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);

export default Product;
export type { IProduct, IWeightPrice, INutrition };
