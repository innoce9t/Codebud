import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Project, PROJECT_TYPES } from '../models/Project.js';
import { File } from '../models/File.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, notFound, forbidden } from '../utils/http.js';
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
      $or: [{ owner: req.userId }, { 'collaborators.user': req.userId }],
    };
    if (typeof req.query.type === 'string') filter.type = req.query.type;
    const docs = await Project.find(filter).sort({ updatedAt: -1 });

    // Attach the owner's display name/email (so the UI can show "Shared by …").
    const ownerIds = [...new Set(docs.map((d) => String(d.owner)))];
    const owners = await User.find({ _id: { $in: ownerIds } }).select('name email');
    const ownerMap = new Map(owners.map((u) => [u.id, { name: u.name, email: u.email }]));
    const projects = docs.map((d) => {
      const o = ownerMap.get(String(d.owner));
      // toJSON() strips shareToken/__v; then we add the owner fields.
      return { ...d.toJSON(), ownerName: o?.name ?? '', ownerEmail: o?.email ?? '' };
    });
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

// Build the people list (with how they joined) for a project.
async function collaboratorList(project: { collaborators: { user: unknown; via: string }[] }) {
  const ids = project.collaborators.map((c) => c.user);
  const users = await User.find({ _id: { $in: ids } }).select('name email');
  const viaById = new Map(project.collaborators.map((c) => [String(c.user), c.via]));
  return users.map((u) => ({ _id: u.id, name: u.name, email: u.email, via: viaById.get(u.id) ?? 'invite' }));
}

// Share state (owner or collaborator can view; share token only to owner).
router.get(
  '/:projectId/collaborators',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    const isOwner = String(project.owner) === req.userId;
    const [owner, collaborators] = await Promise.all([
      User.findById(project.owner).select('name email'),
      collaboratorList(project),
    ]);
    res.json({
      owner,
      collaborators,
      isOwner,
      linkSharing: project.linkSharing,
      shareToken: isOwner ? project.shareToken : undefined,
    });
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
    const exists = project.collaborators.some((c) => String(c.user) === String(target._id));
    if (!exists) {
      await Project.updateOne(
        { _id: project._id },
        { $push: { collaborators: { user: target._id, via: 'invite' } } },
      );
    }
    const fresh = await Project.findById(project._id);
    res.status(201).json({ collaborators: await collaboratorList(fresh!) });
  }),
);

// Remove a collaborator (owner only).
router.delete(
  '/:projectId/collaborators/:userId',
  asyncHandler(async (req, res) => {
    const project = await loadOwnedProject(req);
    await Project.updateOne(
      { _id: project._id },
      { $pull: { collaborators: { user: req.params.userId } } },
    );
    const fresh = await Project.findById(project._id);
    res.json({ collaborators: await collaboratorList(fresh!) });
  }),
);

const linkSchema = z.object({ linkSharing: z.boolean() });

// Toggle "anyone with the link" access (owner only).
router.put(
  '/:projectId/share',
  asyncHandler(async (req, res) => {
    const project = await loadOwnedProject(req);
    const { linkSharing } = linkSchema.parse(req.body);
    if (linkSharing) {
      if (!project.shareToken) project.shareToken = crypto.randomBytes(16).toString('hex');
      project.linkSharing = true;
      await project.save();
    } else {
      // Disabling revokes everyone who joined via the link.
      await Project.updateOne(
        { _id: project._id },
        { $set: { linkSharing: false }, $pull: { collaborators: { via: 'link' } } },
      );
    }
    const fresh = await Project.findById(project._id);
    res.json({
      linkSharing: fresh!.linkSharing,
      shareToken: fresh!.shareToken,
      collaborators: await collaboratorList(fresh!),
    });
  }),
);

// Regenerate the share link (invalidates old links) — owner only.
router.post(
  '/:projectId/share/regenerate',
  asyncHandler(async (req, res) => {
    const project = await loadOwnedProject(req);
    project.shareToken = crypto.randomBytes(16).toString('hex');
    await project.save();
    res.json({ shareToken: project.shareToken });
  }),
);

// Join a project via a share link token (any authenticated user).
const joinSchema = z.object({ token: z.string().min(1) });
router.post(
  '/:projectId/join',
  asyncHandler(async (req, res) => {
    const { token } = joinSchema.parse(req.body);
    const id = req.params.projectId;
    if (!mongoose.isValidObjectId(id)) throw badRequest('Invalid project id');
    const project = await Project.findById(id);
    if (!project) throw notFound('Project not found');

    const isOwner = String(project.owner) === req.userId;
    const already = project.collaborators.some((c) => String(c.user) === req.userId);
    if (!isOwner && !already) {
      if (!project.linkSharing || project.shareToken !== token) {
        throw forbidden('This share link is no longer active');
      }
      await Project.updateOne(
        { _id: project._id },
        { $push: { collaborators: { user: req.userId, via: 'link' } } },
      );
    }
    res.json({ ok: true });
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
