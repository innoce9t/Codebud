import { User } from '../../models/User.js';
import { ProviderKey } from '../../models/ProviderKey.js';
import { findModel } from './catalog.js';
import { decrypt } from '../../utils/crypto.js';
import type { GenerationParams, ProviderConfig } from './types.js';

// The reserved model id that selects the user's custom OpenAI-compatible endpoint.
export const CUSTOM_MODEL_ID = 'custom';

/** Map a user's saved AI preferences into generation params. */
function toParams(ai: {
  temperature: number;
  maxTokens: number;
  topP: number;
  responseStyle: 'concise' | 'balanced' | 'detailed';
  systemInstruction: string;
}): GenerationParams {
  return {
    temperature: ai.temperature,
    maxTokens: ai.maxTokens,
    topP: ai.topP,
    responseStyle: ai.responseStyle,
    systemInstruction: ai.systemInstruction,
  };
}

/** Resolve a user's active model into a provider config (key + model + params), if any. */
export async function resolveProviderConfig(userId: string): Promise<ProviderConfig | undefined> {
  const user = await User.findById(userId);
  if (!user?.activeModel) return undefined;
  const params = user.preferences?.ai ? toParams(user.preferences.ai) : undefined;

  // Custom / local OpenAI-compatible endpoint.
  if (user.activeModel === CUSTOM_MODEL_ID) {
    const custom = user.preferences?.ai?.custom;
    if (!custom?.baseUrl || !custom?.model) return undefined;
    const cred = await ProviderKey.findOne({ user: userId, provider: 'custom' });
    let apiKey = '';
    if (cred) {
      try {
        apiKey = decrypt(cred.apiKeyEnc);
      } catch {
        apiKey = '';
      }
    }
    return { provider: 'custom', apiKey, model: custom.model, baseUrl: custom.baseUrl, params };
  }

  const found = findModel(user.activeModel);
  if (!found) return undefined;
  const cred = await ProviderKey.findOne({ user: userId, provider: found.provider });
  if (!cred) return undefined;
  try {
    return { provider: found.provider, apiKey: decrypt(cred.apiKeyEnc), model: found.model.id, params };
  } catch {
    return undefined; // key undecryptable (e.g. secret changed) — fall back
  }
}
