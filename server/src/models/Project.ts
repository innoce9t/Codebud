import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const PROJECT_TYPES = ['javascript', 'python', 'website'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

const projectSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: PROJECT_TYPES, required: true },
    // Users (besides the owner) who can open and edit the project.
    collaborators: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [], index: true },
  },
  { timestamps: true },
);

projectSchema.set('toJSON', {
  transform(_doc, ret) {
    delete (ret as Record<string, unknown>).__v;
    return ret;
  },
});

export type ProjectType_ = InferSchemaType<typeof projectSchema>;
export const Project = mongoose.model('Project', projectSchema);
