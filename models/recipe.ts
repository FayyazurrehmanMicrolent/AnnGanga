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

interface IRecipe extends Document {
        recipeId: string;
        title: string;
    isLike?: boolean;
        description?: string;
        images: string[];
        ingredients: string[];
        instructions: string[];
        prepTime?: number; // in minutes
        cookTime?: number; // in minutes
        servings?: number;
        productLinks?: IProductLink[]; // Array of product link objects
        tags?: string[];
        isDeleted: boolean;
        createdAt: Date;
        updatedAt: Date;
}

const recipeSchema = new Schema<IRecipe>(
    {
        recipeId: {
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
        description: {
            type: String,
            trim: true,
            default: null,
        },
        images: {
            type: [String],
            default: [],
        },
        ingredients: {
            type: [String],
            required: true,
            default: [],
        },
        instructions: {
            type: [String],
            required: true,
            default: [],
        },
        prepTime: {
            type: Number,
            default: null,
        },
        cookTime: {
            type: Number,
            default: null,
        },
        servings: {
            type: Number,
            default: null,
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
        tags: {
            type: [String],
            default: [],
        },
        isLike: {
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

const Recipe = mongoose.models.Recipe || mongoose.model<IRecipe>('Recipe', recipeSchema);

export default Recipe;
export type { IRecipe };
