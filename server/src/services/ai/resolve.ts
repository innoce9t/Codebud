import { User } from '../../models/User.js';
import { ProviderKey } from '../../models/ProviderKey.js';
import { findModel } from './catalog.js';
import { decrypt } from '../../utils/crypto.js';
import type { ProviderConfig } from './types.js';

/** Resolve a user's active model into a provider config (key + model), if any. */
export async function resolveProviderConfig(userId: string): Promise<ProviderConfig | undefined> {
  const user = await User.findById(userId);
  if (!user?.activeModel) return undefined;
  const found = findModel(user.activeModel);
  if (!found) return undefined;
  const cred = await ProviderKey.findOne({ user: userId, provider: found.provider });
  if (!cred) return undefined;
  try {
    return { provider: found.provider, apiKey: decrypt(cred.apiKeyEnc), model: found.model.id };
  } catch {
    return undefined; // key undecryptable (e.g. secret changed) — fall back
  }
}
