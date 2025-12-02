import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IRecipe extends Document {
    recipeId: string;
    title: string;
    description?: string;
    images: string[];
    ingredients: string[];
    instructions: string[];
    prepTime?: number; // in minutes
    cookTime?: number; // in minutes
    servings?: number;
    productLinks?: string[]; // Array of productIds
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
            type: [String],
            ref: 'Product',
            default: [],
        },
        tags: {
            type: [String],
            default: [],
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
