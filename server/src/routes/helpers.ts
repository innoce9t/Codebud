import type { Request } from 'express';
import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { badRequest, forbidden, notFound } from '../utils/http.js';

/** Loads a project by id from the route and asserts the requester owns it. */
export async function loadOwnedProject(req: Request, idParam = 'projectId') {
  const id = req.params[idParam];
  if (!mongoose.isValidObjectId(id)) throw badRequest('Invalid project id');
  const project = await Project.findById(id);
  if (!project) throw notFound('Project not found');
  if (String(project.owner) !== req.userId) throw forbidden('Not your project');
  return project;
}

/** Loads a project the requester can access (owner OR a collaborator). */
export async function loadAccessibleProject(req: Request, idParam = 'projectId') {
  const id = req.params[idParam];
  if (!mongoose.isValidObjectId(id)) throw badRequest('Invalid project id');
  const project = await Project.findById(id);
  if (!project) throw notFound('Project not found');
  const uid = req.userId;
  const isOwner = String(project.owner) === uid;
  const isCollaborator = (project.collaborators ?? []).some((c) => String(c.user) === uid);
  if (!isOwner && !isCollaborator) throw forbidden('You do not have access to this project');
  return project;
}

/** Normalizes a file path: strips leading slashes, collapses, blocks traversal. */
export function normalizePath(input: string): string {
  const clean = input.replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!clean || clean.includes('..')) throw badRequest('Invalid file path');
  return clean;
}
