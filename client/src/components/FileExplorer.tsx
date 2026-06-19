import { useState } from 'react';
import { buildTree, iconFor, type TreeNode } from '../fileTree';
import type { FileNode } from '../types';

interface Props {
  files: FileNode[];
  activeId: string | null;
  onSelect: (file: FileNode) => void;
  onCreate: (path: string) => void;
  onDelete: (file: FileNode) => void;
  onRename: (file: FileNode, newPath: string) => void;
}

export default function FileExplorer({ files, activeId, onSelect, onCreate, onDelete, onRename }: Props) {
  const tree = buildTree(files);
  const [adding, setAdding] = useState(false);
  const [newPath, setNewPath] = useState('');

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const p = newPath.trim();
    if (p) onCreate(p);
    setNewPath('');
    setAdding(false);
  }

  return (
    <div className="flex h-full flex-col bg-slate-950/40">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Explorer</span>
        <button
          onClick={() => setAdding(true)}
          className="rounded px-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          title="New file"
        >
          ＋
        </button>
      </div>

      {adding && (
        <form onSubmit={submitNew} className="border-b border-slate-800 p-2">
          <input
            autoFocus
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onBlur={() => setAdding(false)}
            placeholder="src/new-file.js"
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white outline-none focus:border-brand-500"
          />
          <p className="mt-1 text-[11px] text-slate-500">Use / for folders. Enter to create.</p>
        </form>
      )}

      <div className="flex-1 overflow-auto py-1">
        {tree.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={0}
            activeId={activeId}
            onSelect={onSelect}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))}
      </div>
    </div>
  );
}

function TreeItem({
  node,
  depth,
  activeId,
  onSelect,
  onDelete,
  onRename,
}: {
  node: TreeNode;
  depth: number;
  activeId: string | null;
  onSelect: (file: FileNode) => void;
  onDelete: (file: FileNode) => void;
  onRename: (file: FileNode, newPath: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          style={pad}
          className="flex w-full items-center gap-1.5 py-1 text-sm text-slate-300 hover:bg-slate-800/70"
        >
          <span className="text-xs">{open ? '▾' : '▸'}</span>
          <span>📁</span>
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children.map((c) => (
          <TreeItem key={c.path} node={c} depth={depth + 1} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onRename={onRename} />
        ))}
      </div>
    );
  }

  const file = node.file!;
  const active = file._id === activeId;
  return (
    <div
      style={pad}
      className={`group flex items-center gap-1.5 py-1 pr-2 text-sm ${
        active ? 'bg-brand-600/20 text-white' : 'text-slate-300 hover:bg-slate-800/70'
      }`}
    >
      <button onClick={() => onSelect(file)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
        <span>{iconFor(node)}</span>
        <span className="truncate">{node.name}</span>
      </button>
      <button
        onClick={() => {
          const next = prompt('Rename / move file to:', file.path);
          if (next && next !== file.path) onRename(file, next);
        }}
        className="text-slate-600 opacity-0 hover:text-white group-hover:opacity-100"
        title="Rename"
      >
        ✎
      </button>
      <button
        onClick={() => onDelete(file)}
        className="text-slate-600 opacity-0 hover:text-red-400 group-hover:opacity-100"
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}
