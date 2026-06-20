import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const PROJECT_TYPES = ['javascript', 'python', 'website'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

const projectSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: PROJECT_TYPES, required: true },
    // Users (besides the owner) who can open and edit the project, and how they joined.
    collaborators: {
      type: [
        new Schema(
          {
            user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
            via: { type: String, enum: ['invite', 'link'], default: 'invite' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    // "Anyone with the link" access (Google-Docs style).
    linkSharing: { type: Boolean, default: false },
    shareToken: { type: String, default: '' },
  },
  { timestamps: true },
);

projectSchema.set('toJSON', {
  transform(_doc, ret) {
    const r = ret as Record<string, unknown>;
    delete r.__v;
    delete r.shareToken; // only exposed to the owner via the share endpoint
    return r;
  },
});

export type ProjectType_ = InferSchemaType<typeof projectSchema>;
export const Project = mongoose.model('Project', projectSchema);
