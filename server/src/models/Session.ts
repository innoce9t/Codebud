import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const sessionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New conversation' },
    // Optional — when set, AI gets access to that project's files.
    project: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
  },
  { timestamps: true },
);

sessionSchema.set('toJSON', {
  transform(_doc, ret) {
    delete (ret as Record<string, unknown>).__v;
    return ret;
  },
});

export type SessionType = InferSchemaType<typeof sessionSchema>;
export const Session = mongoose.model('Session', sessionSchema);
