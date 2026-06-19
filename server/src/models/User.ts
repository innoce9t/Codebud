import mongoose, { Schema, type Model, type HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

interface UserModel extends Model<IUser, {}, IUserMethods> {
  hashPassword(plain: string): Promise<string>;
}

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = function (plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
};

// Never leak the password hash through JSON serialization.
userSchema.set('toJSON', {
  transform(_doc, ret) {
    const r = ret as unknown as Record<string, unknown>;
    delete r.passwordHash;
    delete r.__v;
    return r;
  },
});

export type UserDoc = HydratedDocument<IUser, IUserMethods>;

export const User = mongoose.model<IUser, UserModel>('User', userSchema);
