import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const chatMessageSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    // Optional record of file edits the assistant performed for this message.
    edits: {
      type: [
        new Schema(
          { path: String, action: { type: String, enum: ['create', 'update', 'delete'] } },
          { _id: false },
        ),
      ],
      default: [],
    },
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
