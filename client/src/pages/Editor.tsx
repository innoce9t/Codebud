import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { History, Keyboard, PanelBottom, PanelBottomClose } from 'lucide-react';
import FileExplorer from '../components/FileExplorer';
import CodeEditor from '../components/CodeEditor';
import ChatPanel from '../components/ChatPanel';
import OutputPanel from '../components/OutputPanel';
import VersionHistory from '../components/VersionHistory';
import { Button, Modal, Spinner } from '../components/ui';
import { fileApi, projectApi } from '../api';
import { getSocket } from '../socket';
import { WORKSPACES } from '../workspaceMeta';
import { acceptAttr, isAllowedFile, notAllowedMessage } from '../workspaceRules';
import type { FileNode, Project } from '../types';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB per file

type SaveState = 'idle' | 'saving' | 'saved';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [showOutput, setShowOutput] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const active = files.find((f) => f._id === activeId) ?? null;

  const reloadFiles = useCallback(async () => {
    if (!id) return;
    const fresh = await fileApi.list(id);
    setFiles(fresh);
  }, [id]);

  // Initial load.
  useEffect(() => {
    if (!id) return;
    projectApi
      .get(id)
      .then(({ project, files }) => {
        setProject(project);
        setFiles(files);
        const firstFile = files.find((f) => !f.isFolder);
        setActiveId(firstFile?._id ?? null);
      })
      .catch(() => nav('/'))
      .finally(() => setLoading(false));
  }, [id, nav]);

  // Realtime: join room and react to remote/AI changes.
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    socket.emit('project:join', id);
    const refetch = () => reloadFiles();
    socket.on('file:created', refetch);
    socket.on('file:deleted', refetch);
    socket.on('file:renamed', refetch);
    socket.on('files:bulk-changed', refetch);
    socket.on('file:updated', (payload: { file: FileNode }) => {
      // Only patch files we are not actively editing to avoid clobbering keystrokes.
      setFiles((prev) =>
        prev.map((f) => (f._id === payload.file._id && f._id !== activeId ? payload.file : f)),
      );
    });
    return () => {
      socket.emit('project:leave', id);
      socket.off('file:created', refetch);
      socket.off('file:deleted', refetch);
      socket.off('file:renamed', refetch);
      socket.off('files:bulk-changed', refetch);
      socket.off('file:updated');
    };
  }, [id, activeId, reloadFiles]);

  function handleChange(value: string) {
    if (!active || !id) return;
    setFiles((prev) => prev.map((f) => (f._id === active._id ? { ...f, content: value } : f)));
    setSaveState('saving');

    // Broadcast live keystrokes to collaborators.
    getSocket().emit('editor:change', { projectId: id, fileId: active._id, content: value });

    // Debounced autosave.
    clearTimeout(saveTimers.current[active._id]);
    saveTimers.current[active._id] = setTimeout(async () => {
      try {
        await fileApi.save(id, active._id, value);
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1200);
      } catch {
        setSaveState('idle');
      }
    }, 700);
  }

  function runProject() {
    setShowOutput(true);
    // Let the output panel mount/show before triggering the run.
    setTimeout(() => window.dispatchEvent(new CustomEvent('codebud:run')), 60);
  }

  async function saveNow() {
    if (!active || !id) return;
    clearTimeout(saveTimers.current[active._id]);
    setSaveState('saving');
    try {
      await fileApi.save(id, active._id, active.content);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1200);
    } catch {
      setSaveState('idle');
    }
  }

  function cycleFile(dir: 1 | -1) {
    const list = files.filter((f) => !f.isFolder);
    if (!list.length) return;
    const idx = Math.max(0, list.findIndex((f) => f._id === activeId));
    const next = (idx + dir + list.length) % list.length;
    setActiveId(list[next]._id);
  }

  // Keyboard shortcuts (capture phase so they win over the Monaco editor).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const typing =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (mod && e.key === 'Enter') {
        e.preventDefault();
        runProject();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveNow();
      } else if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setShowOutput((s) => !s);
      } else if (mod && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        document.getElementById('cb-chat-input')?.focus();
      } else if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        cycleFile(e.key === 'ArrowDown' ? 1 : -1);
      } else if (e.key === '?' && !typing) {
        e.preventDefault();
        setShowShortcuts((s) => !s);
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, activeId, id, active?.content]);

  async function createFile(path: string) {
    if (!id || !project) return;
    if (!isAllowedFile(project.type, path)) {
      alert(notAllowedMessage(project.type, path));
      return;
    }
    try {
      const file = await fileApi.create(id, { path });
      await reloadFiles();
      setActiveId(file._id);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleUpload(fileList: FileList) {
    if (!id || !project) return;
    const incoming = Array.from(fileList);
    const skipped: string[] = [];
    const usable: File[] = [];
    for (const f of incoming) {
      if (!isAllowedFile(project.type, f.name)) skipped.push(`${f.name} (type)`);
      else if (f.size > MAX_UPLOAD_BYTES) skipped.push(`${f.name} (too large)`);
      else usable.push(f);
    }

    let lastId: string | null = null;
    for (const f of usable) {
      try {
        const content = await f.text();
        const created = await fileApi.create(id, { path: f.name, content });
        lastId = created._id;
      } catch (err) {
        skipped.push(`${f.name} (${(err as Error).message})`);
      }
    }
    await reloadFiles();
    if (lastId) setActiveId(lastId);
    if (skipped.length) alert(`Some files were skipped:\n- ${skipped.join('\n- ')}`);
  }

  async function deleteFile(file: FileNode) {
    if (!id || !confirm(`Delete ${file.path}?`)) return;
    await fileApi.remove(id, file._id);
    await reloadFiles();
    if (activeId === file._id) setActiveId(null);
  }

  async function renameFile(file: FileNode, newPath: string) {
    if (!id || !project) return;
    if (!file.isFolder && !isAllowedFile(project.type, newPath)) {
      alert(notAllowedMessage(project.type, newPath));
      return;
    }
    try {
      await fileApi.rename(id, file._id, newPath);
      await reloadFiles();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  if (!project) return null;

  const meta = WORKSPACES[project.type];
  const MetaIcon = meta.Icon;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 items-center gap-2 border-b border-slate-200 bg-surface px-4">
        <button
          onClick={() => nav(`/workspace/${project.type}`)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <MetaIcon className={`h-4 w-4 ${meta.accent}`} /> {meta.title.replace(' Workspace', '')}
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-900">{project.name}</span>
        <span className="ml-2 text-xs text-slate-400">
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : ''}
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Explorer */}
        <aside className="w-56 shrink-0 border-r border-slate-200">
          <FileExplorer
            files={files}
            activeId={activeId}
            accept={acceptAttr(project.type)}
            onSelect={(f) => setActiveId(f._id)}
            onCreate={createFile}
            onUpload={handleUpload}
            onDelete={deleteFile}
            onRename={renameFile}
          />
        </aside>

        {/* Editor + output */}
        <main className="flex min-w-0 flex-1 flex-col bg-surface">
          <div className="flex items-center justify-between border-b border-slate-200 bg-surface px-3 py-1.5">
            <span className="truncate text-sm text-slate-600">{active ? active.path : 'No file selected'}</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="!py-1 !px-2 text-xs" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)">
                <Keyboard className="h-3.5 w-3.5" /> Shortcuts
              </Button>
              {active && (
                <Button variant="ghost" className="!py-1 !px-2 text-xs" onClick={() => setShowHistory(true)}>
                  <History className="h-3.5 w-3.5" /> History
                </Button>
              )}
              <Button variant="ghost" className="!py-1 !px-2 text-xs" onClick={() => setShowOutput((s) => !s)}>
                {showOutput ? <PanelBottomClose className="h-3.5 w-3.5" /> : <PanelBottom className="h-3.5 w-3.5" />}
                {showOutput ? 'Hide' : 'Show'} {project.type === 'website' ? 'Preview' : 'Console'}
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              {active ? (
                <CodeEditor path={active.path} value={active.content} onChange={handleChange} />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">
                  Select or create a file to start editing.
                </div>
              )}
            </div>

            {showOutput && (
              <div className="h-2/5 min-h-[180px] border-t border-slate-200">
                <OutputPanel type={project.type} files={files} />
              </div>
            )}
          </div>
        </main>

        {/* Chat */}
        <aside className="w-96 shrink-0">
          <ChatPanel projectId={project._id} onFilesChanged={reloadFiles} />
        </aside>
      </div>

      {showHistory && active && id && (
        <VersionHistory
          projectId={id}
          file={active}
          onClose={() => setShowHistory(false)}
          onRestored={reloadFiles}
        />
      )}

      <Modal open={showShortcuts} onClose={() => setShowShortcuts(false)} title="Keyboard shortcuts">
        <ul className="space-y-2 text-sm">
          {[
            ['Run project', 'Ctrl/⌘ + Enter'],
            ['Save file', 'Ctrl/⌘ + S'],
            ['Toggle console / preview', 'Ctrl/⌘ + B'],
            ['Focus AI chat', 'Ctrl/⌘ + I'],
            ['Next file', 'Alt + ↓'],
            ['Previous file', 'Alt + ↑'],
            ['Show this help', '?'],
          ].map(([label, keys]) => (
            <li key={label} className="flex items-center justify-between">
              <span className="text-slate-600">{label}</span>
              <kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
