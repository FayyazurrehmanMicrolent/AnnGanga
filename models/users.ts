import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IUser extends Document {
  id: string;
  email?: string;
  phone: string;
  name?: string;
  dob?: Date;
  profileImage?: string;
  roleId?: string;
  isActive: boolean;
  isBlocked: boolean;
  blockedAt?: Date;
  blockedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  lastLogin?: Date;
  deviceToken?: string;
}

const userSchema = new Schema<IUser>(
  {
    id: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      required: false,
    },
    phone: {
      type: String,
      unique: true,
      required: true,
      validate: {
        validator: function (value: string) {
          // Require exactly 10 digits, no spaces or characters
          return /^\d{10}$/.test(value);
        },
        message: 'Please provide a valid phone number: exactly 10 digits, no spaces or characters.',
      },
    },
    name: {
      type: String,
      default: null,
    },
    dob: {
      type: Date,
      default: null,
    },
    profileImage: {
      type: String,
      default: null,
    },
    deviceToken: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },
    // Link to Roles table via roleId (string UUID from Roles.roleId)
    roleId: {
      type: String,
      ref: 'Role',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockedReason: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Validate that phone is provided
userSchema.pre('save', async function (next) {
  if (this.isModified('phone')) {
    if (!this.phone) {
      throw new Error('Phone number is required.');
    }
  }
  next();
});

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User;
export type { IUser };
