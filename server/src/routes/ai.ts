import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, notFound } from '../utils/http.js';
import { ProviderKey, PROVIDERS, type Provider } from '../models/ProviderKey.js';
import { User } from '../models/User.js';
import { MODEL_CATALOG, findModel } from '../services/ai/catalog.js';
import { encrypt, last4 } from '../utils/crypto.js';

const router = Router();
router.use(requireAuth);

// Catalog of models + this user's connection status and active selection.
router.get(
  '/catalog',
  asyncHandler(async (req, res) => {
    const [keys, user] = await Promise.all([
      ProviderKey.find({ user: req.userId }),
      User.findById(req.userId),
    ]);
    const byProvider = new Map(keys.map((k) => [k.provider, k]));
    const providers = MODEL_CATALOG.map((p) => ({
      ...p,
      connected: byProvider.has(p.id),
      last4: byProvider.get(p.id)?.last4 ?? null,
    }));
    res.json({ providers, activeModel: user?.activeModel || null });
  }),
);

const connectSchema = z.object({ apiKey: z.string().min(8, 'API key looks too short').max(400) });

// Connect / update a provider's API key.
router.put(
  '/providers/:provider',
  asyncHandler(async (req, res) => {
    const provider = req.params.provider as Provider;
    if (!PROVIDERS.includes(provider)) throw badRequest('Unknown provider');
    const { apiKey } = connectSchema.parse(req.body);
    const key = apiKey.trim();
    await ProviderKey.findOneAndUpdate(
      { user: req.userId, provider },
      { apiKeyEnc: encrypt(key), last4: last4(key) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.json({ ok: true, provider, last4: last4(key) });
  }),
);

// Disconnect a provider (and clear active model if it belonged to it).
router.delete(
  '/providers/:provider',
  asyncHandler(async (req, res) => {
    const provider = req.params.provider as Provider;
    if (!PROVIDERS.includes(provider)) throw badRequest('Unknown provider');
    await ProviderKey.deleteOne({ user: req.userId, provider });

    const user = await User.findById(req.userId);
    if (user?.activeModel) {
      const found = findModel(user.activeModel);
      if (found && found.provider === provider) {
        user.activeModel = '';
        await user.save();
      }
    }
    res.json({ ok: true });
  }),
);

const activeSchema = z.object({ model: z.string().min(1) });

// Select the active model used by the chat. Must belong to a connected provider.
router.put(
  '/active',
  asyncHandler(async (req, res) => {
    const { model } = activeSchema.parse(req.body);
    const found = findModel(model);
    if (!found) throw notFound('Unknown model');
    const connected = await ProviderKey.findOne({ user: req.userId, provider: found.provider });
    if (!connected) throw badRequest(`Connect ${found.provider} first`);
    await User.findByIdAndUpdate(req.userId, { activeModel: model });
    res.json({ ok: true, activeModel: model });
  }),
);

export default router;
