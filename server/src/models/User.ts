import mongoose, { Schema, type Model, type HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserPreferences {
  language: string;
  timezone: string;
  theme: { mode: 'light' | 'dark' | 'system'; accent: string };
  editor: { fontSize: number; tabSize: number; wordWrap: boolean; minimap: boolean; aiCompletions: boolean };
  notifications: { productUpdates: boolean; projectActivity: boolean };
}

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  activeModel?: string;
  subscriptionTier: 'free' | 'pro' | 'team';
  preferences: IUserPreferences;
  billing: { cardBrand: string; cardLast4: string };
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

interface UserModel extends Model<IUser, {}, IUserMethods> {
  hashPassword(plain: string): Promise<string>;
}

const editorPrefs = new Schema(
  {
    fontSize: { type: Number, default: 13, min: 10, max: 24 },
    tabSize: { type: Number, default: 2, min: 2, max: 8 },
    wordWrap: { type: Boolean, default: false },
    minimap: { type: Boolean, default: false },
    aiCompletions: { type: Boolean, default: true },
  },
  { _id: false },
);

const notifPrefs = new Schema(
  {
    productUpdates: { type: Boolean, default: true },
    projectActivity: { type: Boolean, default: true },
  },
  { _id: false },
);

const themePrefs = new Schema(
  {
    mode: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    accent: { type: String, default: 'indigo' },
  },
  { _id: false },
);

const preferencesSchema = new Schema(
  {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    theme: { type: themePrefs, default: () => ({}) },
    editor: { type: editorPrefs, default: () => ({}) },
    notifications: { type: notifPrefs, default: () => ({}) },
  },
  { _id: false },
);

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    activeModel: { type: String, default: '' },
    subscriptionTier: { type: String, enum: ['free', 'pro', 'team'], default: 'free' },
    preferences: { type: preferencesSchema, default: () => ({}) },
    billing: {
      type: new Schema(
        { cardBrand: { type: String, default: '' }, cardLast4: { type: String, default: '' } },
        { _id: false },
      ),
      default: () => ({}),
    },
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
