import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface IUserFilter extends Document {
  filterId: string;
  userId: string;
  name?: string | null;
  filters: any;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userFilterSchema = new Schema<IUserFilter>(
  {
    filterId: {
      type: String,
      default: uuidv4,
      unique: true,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      default: null,
    },
    filters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const UserFilter = mongoose.models.UserFilter || mongoose.model<IUserFilter>('UserFilter', userFilterSchema);

export default UserFilter;
export type { IUserFilter };
