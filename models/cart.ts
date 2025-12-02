import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface ICartItem {
    productId: string;
    quantity: number;
    weightOption?: string;
    price: number;
}

interface ICart extends Document {
    cartId: string;
    userId: string;
    items: ICartItem[];
    createdAt: Date;
    updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
    {
        productId: {
            type: String,
            ref: 'Product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        weightOption: {
            type: String,
            default: null,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);

const cartSchema = new Schema<ICart>(
    {
        cartId: {
            type: String,
            default: uuidv4,
            unique: true,
            required: true,
        },
        userId: {
            type: String,
            ref: 'User',
            required: true,
            unique: true,
        },
        items: {
            type: [cartItemSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster lookups
// Note: `userId` is declared with `unique: true` above so an index is already created.
// Removing explicit `schema.index` to avoid duplicate index warnings from Mongoose.

const Cart = mongoose.models.Cart || mongoose.model<ICart>('Cart', cartSchema);

export default Cart;
export type { ICart, ICartItem };
