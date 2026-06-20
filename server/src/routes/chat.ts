import { Router } from 'express';
import { z } from 'zod';
import { File } from '../models/File.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { loadAccessibleProject } from './helpers.js';
import { runAi, type ProviderConfig } from '../services/ai/index.js';
import { applyEdits } from '../services/fileService.js';
import { emitToProject } from '../realtime/socket.js';
import type { ProjectType } from '../models/Project.js';
import { User } from '../models/User.js';
import { ProviderKey } from '../models/ProviderKey.js';
import { findModel } from '../services/ai/catalog.js';
import { decrypt } from '../utils/crypto.js';

/** Resolve the caller's active model into a provider config (key + model), if any. */
async function resolveProviderConfig(userId: string): Promise<ProviderConfig | undefined> {
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

// Mounted at /api/projects/:projectId/chat
const router = Router({ mergeParams: true });
router.use(requireAuth);

// Get chat history for a project.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    const messages = await ChatMessage.find({ project: project._id }).sort({ createdAt: 1 });
    res.json({ messages });
  }),
);

const sendSchema = z.object({ message: z.string().min(1).max(8000) });

// Send a message to the AI. Persists both turns, applies any file edits.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    const { message } = sendSchema.parse(req.body);

    const [files, history] = await Promise.all([
      File.find({ project: project._id, isFolder: { $ne: true } }).sort({ path: 1 }),
      ChatMessage.find({ project: project._id }).sort({ createdAt: 1 }).limit(20),
    ]);

    // Persist the user's message immediately.
    const userMsg = await ChatMessage.create({ project: project._id, role: 'user', content: message });

    const config = await resolveProviderConfig(req.userId!);
    let ai;
    try {
      ai = await runAi(
        {
          projectType: project.type as ProjectType,
          projectName: project.name,
          files: files.map((f) => ({ path: f.path, content: f.content ?? '' })),
          history: history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
          message,
        },
        config,
      );
    } catch (err) {
      // Provider call failed (e.g. invalid key) — reply gracefully instead of 500.
      const assistantMessage = await ChatMessage.create({
        project: project._id,
        role: 'assistant',
        content: `The selected AI model could not be reached: ${
          (err as Error).message
        }\n\nCheck your API key under **AI Models**, or clear the active model to use the default assistant.`,
      });
      res.json({ userMessage: userMsg, assistantMessage, edits: [] });
      return;
    }

    // Apply edits the AI requested.
    const applied = ai.edits.length ? await applyEdits(project._id, ai.edits) : [];

    const assistantMsg = await ChatMessage.create({
      project: project._id,
      role: 'assistant',
      content: ai.reply,
      edits: applied,
    });

    // Notify realtime clients that files changed so editors refresh.
    if (applied.length) emitToProject(String(project._id), 'files:bulk-changed', { applied }, req);

    res.json({ userMessage: userMsg, assistantMessage: assistantMsg, edits: applied });
  }),
);

// Clear chat history.
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    await ChatMessage.deleteMany({ project: project._id });
    res.json({ ok: true });
  }),
);

export default router;
