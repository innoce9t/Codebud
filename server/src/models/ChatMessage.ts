import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const chatMessageSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    session: { type: Schema.Types.ObjectId, ref: 'Session', default: null, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    // Edits already applied to disk.
    edits: {
      type: [
        new Schema(
          { path: String, action: { type: String, enum: ['create', 'update', 'delete'] } },
          { _id: false },
        ),
      ],
      default: [],
    },
    // Edits proposed but not yet applied (agent review mode).
    pendingEdits: {
      type: [
        new Schema(
          {
            path: String,
            action: { type: String, enum: ['create', 'update', 'delete'] },
            content: String,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    // Tracks whether pending edits were approved or rejected.
    editsApproved: { type: Boolean, default: null },
  },
  { timestamps: true },
);

chatMessageSchema.set('toJSON', {
  transform(_doc, ret) {
    delete (ret as Record<string, unknown>).__v;
    return ret;
  },
});

export type ChatMessageType = InferSchemaType<typeof chatMessageSchema>;
export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
