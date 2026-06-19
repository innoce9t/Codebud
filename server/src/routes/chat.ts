import { Router } from 'express';
import { z } from 'zod';
import { File } from '../models/File.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { loadOwnedProject } from './helpers.js';
import { runAi } from '../services/ai/index.js';
import { applyEdits } from '../services/fileService.js';
import { emitToProject } from '../realtime/socket.js';
import type { ProjectType } from '../models/Project.js';

// Mounted at /api/projects/:projectId/chat
const router = Router({ mergeParams: true });
router.use(requireAuth);

// Get chat history for a project.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const project = await loadOwnedProject(req);
    const messages = await ChatMessage.find({ project: project._id }).sort({ createdAt: 1 });
    res.json({ messages });
  }),
);

const sendSchema = z.object({ message: z.string().min(1).max(8000) });

// Send a message to the AI. Persists both turns, applies any file edits.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const project = await loadOwnedProject(req);
    const { message } = sendSchema.parse(req.body);

    const [files, history] = await Promise.all([
      File.find({ project: project._id, isFolder: { $ne: true } }).sort({ path: 1 }),
      ChatMessage.find({ project: project._id }).sort({ createdAt: 1 }).limit(20),
    ]);

    // Persist the user's message immediately.
    const userMsg = await ChatMessage.create({ project: project._id, role: 'user', content: message });

    const ai = await runAi({
      projectType: project.type as ProjectType,
      projectName: project.name,
      files: files.map((f) => ({ path: f.path, content: f.content ?? '' })),
      history: history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      message,
    });

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
    const project = await loadOwnedProject(req);
    await ChatMessage.deleteMany({ project: project._id });
    res.json({ ok: true });
  }),
);

export default router;
