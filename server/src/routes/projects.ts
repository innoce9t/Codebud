import { Router } from 'express';
import { z } from 'zod';
import { Project, PROJECT_TYPES } from '../models/Project.js';
import { File } from '../models/File.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
import { loadOwnedProject } from './helpers.js';
import { templateFiles } from './templates.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  type: z.enum(PROJECT_TYPES),
  template: z.string().max(40).optional(),
});

// List the current user's projects (optionally filtered by ?type=).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter: Record<string, unknown> = { owner: req.userId };
    if (typeof req.query.type === 'string') filter.type = req.query.type;
    const projects = await Project.find(filter).sort({ updatedAt: -1 });
    res.json({ projects });
  }),
);

// Create a project and seed it with starter files.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, description, type, template } = createSchema.parse(req.body);
    const project = await Project.create({ owner: req.userId, name, description, type });
    await File.insertMany(
      templateFiles(type, template).map((f) => ({
        project: project._id,
        path: f.path,
        content: f.content,
      })),
    );
    res.status(201).json({ project });
  }),
);

// Get a single project with its files.
router.get(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const project = await loadOwnedProject(req);
    const files = await File.find({ project: project._id }).sort({ path: 1 });
    res.json({ project, files });
  }),
);

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
});

router.patch(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const project = await loadOwnedProject(req);
    const patch = updateSchema.parse(req.body);
    Object.assign(project, patch);
    await project.save();
    res.json({ project });
  }),
);

// Delete a project and all of its files + chat.
router.delete(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const project = await loadOwnedProject(req);
    await Promise.all([
      File.deleteMany({ project: project._id }),
      ChatMessage.deleteMany({ project: project._id }),
      project.deleteOne(),
    ]);
    res.json({ ok: true });
  }),
);

export default router;
