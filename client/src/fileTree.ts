import type { FileNode } from './types';

export interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  file?: FileNode;
  children: TreeNode[];
}

/** Builds a nested tree from flat, path-based file records. */
export function buildTree(files: FileNode[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isFolder: true, children: [] };

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    let node = root;
    segments.forEach((seg, i) => {
      const isLast = i === segments.length - 1;
      const path = segments.slice(0, i + 1).join('/');
      let child = node.children.find((c) => c.name === seg);
      if (!child) {
        child = {
          name: seg,
          path,
          isFolder: isLast ? !!file.isFolder : true,
          file: isLast && !file.isFolder ? file : undefined,
          children: [],
        };
        node.children.push(child);
      } else if (isLast && !file.isFolder) {
        child.file = file;
        child.isFolder = false;
      }
      node = child;
    });
  }

  sortTree(root);
  return root;
}

function sortTree(node: TreeNode) {
  node.children.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(sortTree);
}

export function languageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'jsx':
      return 'javascript';
    case 'tsx':
      return 'typescript';
    case 'py':
      return 'python';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

export function iconFor(node: TreeNode): string {
  if (node.isFolder) return '📁';
  const ext = node.name.split('.').pop()?.toLowerCase();
  return (
    {
      js: '🟨',
      mjs: '🟨',
      ts: '🔷',
      py: '🐍',
      html: '🌐',
      css: '🎨',
      json: '🧾',
      md: '📝',
    }[ext ?? ''] ?? '📄'
  );
}
