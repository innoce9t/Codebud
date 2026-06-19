import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * Files are stored path-based to support nested folders without a separate
 * folder collection. e.g. path = "src/utils/math.js". Folders are implied by
 * the path segments, plus explicit folder records (isFolder) so empty folders
 * can exist.
 */
const versionSchema = new Schema(
  {
    content: { type: String, default: '' },
    savedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const fileSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    path: { type: String, required: true, trim: true }, // unique within a project
    isFolder: { type: Boolean, default: false },
    content: { type: String, default: '' },
    // Bounded version history (most recent kept, capped in the route layer).
    versions: { type: [versionSchema], default: [] },
  },
  { timestamps: true },
);

fileSchema.index({ project: 1, path: 1 }, { unique: true });

fileSchema.set('toJSON', {
  transform(_doc, ret) {
    delete (ret as Record<string, unknown>).__v;
    return ret;
  },
});

export type FileType = InferSchemaType<typeof fileSchema>;
export const File = mongoose.model('File', fileSchema);

export const MAX_VERSIONS = 30;
