import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IRole extends Document {
  roleId: string;
  role: string;
  isRoleActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    roleId: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
    },
    role: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isRoleActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Role = mongoose.models.Role || mongoose.model<IRole>('Role', roleSchema);

export default Role;
export type { IRole };
