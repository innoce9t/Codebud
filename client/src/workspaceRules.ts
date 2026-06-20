import type { ProjectType } from './types';

/** Mirrors the server's allowed extensions (server is authoritative). */
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

export function isAllowedFile(type: ProjectType, path: string): boolean {
  const ext = extOf(path);
  if (!ext) return true;
  return ALLOWED_EXT[type].includes(ext);
}

export function notAllowedMessage(type: ProjectType, path: string): string {
  return `".${extOf(path)}" files aren't allowed in a ${type} workspace.\nAllowed: ${ALLOWED_EXT[
    type
  ]
    .map((e) => '.' + e)
    .join(', ')}`;
}

/** accept="" attribute for the upload <input>. */
export function acceptAttr(type: ProjectType): string {
  return ALLOWED_EXT[type].map((e) => '.' + e).join(',');
}
