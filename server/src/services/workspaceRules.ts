import type { ProjectType } from '../models/Project.js';

/** File extensions permitted in each workspace type. */
export const ALLOWED_EXT: Record<ProjectType, string[]> = {
  javascript: ['js', 'mjs', 'cjs', 'json', 'md', 'txt'],
  python: ['py', 'txt', 'md', 'json', 'csv'],
  website: ['html', 'css', 'js', 'mjs', 'json', 'svg', 'md', 'txt'],
};

export function extOf(path: string): string {
  const base = path.split('/').pop() ?? '';
  const i = base.lastIndexOf('.');
  return i > 0 ? base.slice(i + 1).toLowerCase() : '';
}

/** A file is allowed if it has no extension (folder/plain) or a permitted one. */
export function isAllowedFile(type: ProjectType, path: string): boolean {
  const ext = extOf(path);
  if (!ext) return true;
  return ALLOWED_EXT[type].includes(ext);
}

export function notAllowedMessage(type: ProjectType, path: string): string {
  const ext = extOf(path);
  return `".${ext}" files aren't allowed in a ${type} workspace. Allowed types: ${ALLOWED_EXT[type]
    .map((e) => '.' + e)
    .join(', ')}`;
}
