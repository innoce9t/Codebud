import { Router } from 'express';
import { z } from 'zod';
import { Project, PROJECT_TYPES } from '../models/Project.js';
import { File } from '../models/File.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, notFound } from '../utils/http.js';
import { loadOwnedProject, loadAccessibleProject } from './helpers.js';
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
    const filter: Record<string, unknown> = {
      $or: [{ owner: req.userId }, { collaborators: req.userId }],
    };
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

// Get a single project with its files (owner or collaborator).
router.get(
  '/:projectId',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    const files = await File.find({ project: project._id }).sort({ path: 1 });
    res.json({ project, files });
  }),
);

// ── Sharing / collaborators ───────────────────────────────
// List collaborators (owner or collaborator can view).
router.get(
  '/:projectId/collaborators',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    const [owner, collaborators] = await Promise.all([
      User.findById(project.owner).select('name email'),
      User.find({ _id: { $in: project.collaborators } }).select('name email'),
    ]);
    res.json({ owner, collaborators });
  }),
);

const shareSchema = z.object({ email: z.string().email() });

// Add a collaborator by email (owner only).
router.post(
  '/:projectId/collaborators',
  asyncHandler(async (req, res) => {
    const project = await loadOwnedProject(req);
    const { email } = shareSchema.parse(req.body);
    const target = await User.findOne({ email: email.toLowerCase() });
    if (!target) throw notFound('No CodeBud user with that email — they need an account first');
    if (String(target._id) === String(project.owner)) throw badRequest('That user is the owner');
    await Project.updateOne({ _id: project._id }, { $addToSet: { collaborators: target._id } });
    const ids = (await Project.findById(project._id))?.collaborators ?? [];
    const collaborators = await User.find({ _id: { $in: ids } }).select('name email');
    res.status(201).json({ collaborators });
  }),
);

// Remove a collaborator (owner only).
router.delete(
  '/:projectId/collaborators/:userId',
  asyncHandler(async (req, res) => {
    const project = await loadOwnedProject(req);
    await Project.updateOne({ _id: project._id }, { $pull: { collaborators: req.params.userId } });
    const ids = (await Project.findById(project._id))?.collaborators ?? [];
    const collaborators = await User.find({ _id: { $in: ids } }).select('name email');
    res.json({ collaborators });
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
