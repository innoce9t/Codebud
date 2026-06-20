import { useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { buildTree, iconFor, type TreeNode } from '../fileTree';
import type { FileNode } from '../types';

interface Props {
  files: FileNode[];
  activeId: string | null;
  accept?: string;
  onSelect: (file: FileNode) => void;
  onCreate: (path: string) => void;
  onUpload: (files: FileList) => void;
  onDelete: (file: FileNode) => void;
  onRename: (file: FileNode, newPath: string) => void;
}

export default function FileExplorer({
  files,
  activeId,
  accept,
  onSelect,
  onCreate,
  onUpload,
  onDelete,
  onRename,
}: Props) {
  const tree = buildTree(files);
  const [adding, setAdding] = useState(false);
  const [newPath, setNewPath] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const p = newPath.trim();
    if (p) onCreate(p);
    setNewPath('');
    setAdding(false);
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Explorer</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            title="Upload files"
          >
            <Upload className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAdding(true)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            title="New file"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onUpload(e.target.files);
            e.target.value = ''; // allow re-uploading the same file
          }}
        />
      </div>

      {adding && (
        <form onSubmit={submitNew} className="border-b border-slate-200 p-2">
          <input
            autoFocus
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onBlur={() => setAdding(false)}
            placeholder="src/new-file.js"
            className="w-full rounded border border-slate-300 bg-surface px-2 py-1 text-sm text-slate-900 outline-none focus:border-brand-500"
          />
          <p className="mt-1 text-[11px] text-slate-400">Use / for folders. Enter to create.</p>
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
          className="flex w-full items-center gap-1.5 py-1 text-sm text-slate-600 hover:bg-slate-200/60"
        >
          {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          <Folder className="h-4 w-4 shrink-0 text-amber-500" />
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
  const Icon = iconFor(node);
  return (
    <div
      style={pad}
      className={`group flex items-center gap-1.5 py-1 pr-2 text-sm ${
        active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-200/60'
      }`}
    >
      <button onClick={() => onSelect(file)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
        <Icon className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="truncate">{node.name}</span>
      </button>
      <button
        onClick={() => {
          const next = prompt('Rename / move file to:', file.path);
          if (next && next !== file.path) onRename(file, next);
        }}
        className="text-slate-300 opacity-0 hover:text-slate-700 group-hover:opacity-100"
        title="Rename"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onDelete(file)}
        className="text-slate-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
