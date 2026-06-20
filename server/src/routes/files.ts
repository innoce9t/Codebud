import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { File } from '../models/File.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, badRequest, conflict, notFound } from '../utils/http.js';
import { loadAccessibleProject, normalizePath } from './helpers.js';
import { applyEdit } from '../services/fileService.js';
import { isAllowedFile, notAllowedMessage } from '../services/workspaceRules.js';
import type { ProjectType } from '../models/Project.js';
import { emitToProject } from '../realtime/socket.js';

// Mounted at /api/projects/:projectId/files
const router = Router({ mergeParams: true });
router.use(requireAuth);

// List files for a project (content included; projects are small).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    const files = await File.find({ project: project._id }).sort({ path: 1 });
    res.json({ files });
  }),
);

const createSchema = z.object({
  path: z.string().min(1),
  content: z.string().optional(),
  isFolder: z.boolean().optional(),
});

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    const { path: rawPath, content, isFolder } = createSchema.parse(req.body);
    const path = normalizePath(rawPath);
    if (!isFolder && !isAllowedFile(project.type as ProjectType, path)) {
      throw badRequest(notAllowedMessage(project.type as ProjectType, path));
    }
    const exists = await File.findOne({ project: project._id, path });
    if (exists) throw conflict('A file with that path already exists');
    const file = await File.create({
      project: project._id,
      path,
      content: content ?? '',
      isFolder: !!isFolder,
    });
    emitToProject(String(project._id), 'file:created', { file }, req);
    res.status(201).json({ file });
  }),
);

const updateSchema = z.object({ content: z.string() });

// Save file content (manual or autosave). Records a version snapshot.
router.put(
  '/:fileId',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    if (!mongoose.isValidObjectId(req.params.fileId)) throw badRequest('Invalid file id');
    const file = await File.findOne({ _id: req.params.fileId, project: project._id });
    if (!file) throw notFound('File not found');
    const { content } = updateSchema.parse(req.body);

    const result = await applyEdit(project._id, { path: file.path, action: 'update', content });
    const fresh = await File.findOne({ project: project._id, path: file.path });
    emitToProject(String(project._id), 'file:updated', { file: fresh }, req);
    res.json({ file: fresh, result });
  }),
);

// Rename / move a file.
const renameSchema = z.object({ path: z.string().min(1) });
router.patch(
  '/:fileId',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    const file = await File.findOne({ _id: req.params.fileId, project: project._id });
    if (!file) throw notFound('File not found');
    const newPath = normalizePath(renameSchema.parse(req.body).path);
    if (!file.isFolder && !isAllowedFile(project.type as ProjectType, newPath)) {
      throw badRequest(notAllowedMessage(project.type as ProjectType, newPath));
    }
    const clash = await File.findOne({ project: project._id, path: newPath });
    if (clash) throw conflict('A file with that path already exists');
    file.path = newPath;
    await file.save();
    emitToProject(String(project._id), 'file:renamed', { file }, req);
    res.json({ file });
  }),
);

router.delete(
  '/:fileId',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    const file = await File.findOne({ _id: req.params.fileId, project: project._id });
    if (!file) throw notFound('File not found');
    await file.deleteOne();
    emitToProject(String(project._id), 'file:deleted', { fileId: file.id, path: file.path }, req);
    res.json({ ok: true });
  }),
);

// Version history.
router.get(
  '/:fileId/versions',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    const file = await File.findOne({ _id: req.params.fileId, project: project._id });
    if (!file) throw notFound('File not found');
    // Most recent first; index maps back into the stored array.
    const versions = file.versions
      .map((v, i) => ({ index: i, savedAt: v.savedAt, content: v.content }))
      .reverse();
    res.json({ current: file.content, versions });
  }),
);

const restoreSchema = z.object({ index: z.number().int().min(0) });
router.post(
  '/:fileId/restore',
  asyncHandler(async (req, res) => {
    const project = await loadAccessibleProject(req);
    const file = await File.findOne({ _id: req.params.fileId, project: project._id });
    if (!file) throw notFound('File not found');
    const { index } = restoreSchema.parse(req.body);
    const target = file.versions[index];
    if (!target) throw notFound('Version not found');
    await applyEdit(project._id, { path: file.path, action: 'update', content: target.content });
    const fresh = await File.findOne({ project: project._id, path: file.path });
    emitToProject(String(project._id), 'file:updated', { file: fresh }, req);
    res.json({ file: fresh });
  }),
);

export default router;
