import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IAddress extends Document {
    addressId: string;
    userId: string;
    label: 'Home' | 'Work' | 'Other';
        addressType?: 'Home' | 'Work' | 'Other' | 'OtherDetailed';
    name: string;
    phone: string;
        email?: string | null;
    address: string;
    landmark?: string;
    city: string;
    state: string;
        country?: string | null;
    pincode: string;
    lat?: number;
    lng?: number;
    isDefault: boolean;
    isPrimary?: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
    {
        addressId: {
            type: String,
            default: uuidv4,
            unique: true,
            required: true,
        },
        userId: {
            type: String,
            ref: 'User',
            required: true,
        },
        label: {
            type: String,
            enum: ['Home', 'Work', 'Other'],
            default: 'Home',
        },
        addressType: {
            type: String,
            enum: ['Home', 'Work', 'Other', 'OtherDetailed'],
            default: 'Home',
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            validate: {
                validator: function (value: string) {
                    return /^\d{10}$/.test(value);
                },
                message: 'Phone number must be exactly 10 digits',
            },
        },
        email: {
            type: String,
            trim: true,
            default: null,
            validate: {
                validator: function (v: string) {
                    if (v === null || typeof v === 'undefined' || v === '') return true;
                    // basic email regex
                    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
                },
                message: 'Invalid email address',
            },
        },
        address: {
            type: String,
            required: true,
            trim: true,
        },
        landmark: {
            type: String,
            trim: true,
            default: null,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        state: {
            type: String,
            required: true,
            trim: true,
        },
        country: {
            type: String,
            trim: true,
            default: null,
        },
        pincode: {
            type: String,
            required: true,
            validate: {
                validator: function (value: string) {
                    return /^\d{6}$/.test(value);
                },
                message: 'Pincode must be exactly 6 digits',
            },
        },
        lat: {
            type: Number,
            default: null,
        },
        lng: {
            type: Number,
            default: null,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        isPrimary: {
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

// Indexes for faster lookups
addressSchema.index({ userId: 1, isDeleted: 1 });
addressSchema.index({ userId: 1, isDefault: 1 });

const Address = mongoose.models.Address || mongoose.model<IAddress>('Address', addressSchema);

export default Address;
export type { IAddress };
