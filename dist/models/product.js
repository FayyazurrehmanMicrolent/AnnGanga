import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
var weightPriceSchema = new Schema({
    weight: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: false, default: 1 },
}, { _id: false });
var nutritionSchema = new Schema({
    weight: { type: String, required: true },
    // Accept string or mixed object for backward compatibility
    info: { type: Schema.Types.Mixed, required: true },
}, { _id: false });
var productSchema = new Schema({
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
}, {
    timestamps: true,
});
var Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
