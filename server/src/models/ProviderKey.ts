import mongoose, { Schema, type InferSchemaType } from 'mongoose';

// 'custom' is a user-supplied OpenAI-compatible endpoint (local LLMs, self-hosted, etc.).
export const PROVIDERS = ['anthropic', 'openai', 'google', 'custom'] as const;
export type Provider = (typeof PROVIDERS)[number];

const providerKeySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, enum: PROVIDERS, required: true },
    apiKeyEnc: { type: String, required: true }, // AES-256-GCM encrypted
    last4: { type: String, default: '' }, // for display only
  },
  { timestamps: true },
);

providerKeySchema.index({ user: 1, provider: 1 }, { unique: true });

providerKeySchema.set('toJSON', {
  transform(_doc, ret) {
    const r = ret as unknown as Record<string, unknown>;
    delete r.apiKeyEnc; // never expose the encrypted key
    delete r.__v;
    return r;
  },
});

export type ProviderKeyType = InferSchemaType<typeof providerKeySchema>;
export const ProviderKey = mongoose.model('ProviderKey', providerKeySchema);
