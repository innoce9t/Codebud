import { File, MAX_VERSIONS } from '../models/File.js';
import type { FileEdit } from './ai/types.js';
import type { Types } from 'mongoose';

/**
 * Applies a single file edit (create/update/delete) with version history.
 * Pushes the PREVIOUS content onto the version stack before overwriting.
 */
export async function applyEdit(projectId: Types.ObjectId | string, edit: FileEdit) {
  if (edit.action === 'delete') {
    await File.deleteOne({ project: projectId, path: edit.path });
    return { path: edit.path, action: 'delete' as const };
  }

  const existing = await File.findOne({ project: projectId, path: edit.path });
  const content = edit.content ?? '';

  if (!existing) {
    await File.create({ project: projectId, path: edit.path, content, versions: [] });
    return { path: edit.path, action: 'create' as const };
  }

  // Snapshot the old content, then update.
  existing.versions.push({ content: existing.content ?? '', savedAt: new Date() });
  if (existing.versions.length > MAX_VERSIONS) {
    existing.versions.splice(0, existing.versions.length - MAX_VERSIONS);
  }
  existing.content = content;
  await existing.save();
  return { path: edit.path, action: 'update' as const };
}

export async function applyEdits(projectId: Types.ObjectId | string, edits: FileEdit[]) {
  const results = [];
  for (const edit of edits) results.push(await applyEdit(projectId, edit));
  return results;
}
