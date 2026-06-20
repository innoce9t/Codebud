import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { History, Keyboard, PanelBottom, PanelBottomClose, Share2 } from 'lucide-react';
import FileExplorer from '../components/FileExplorer';
import CodeEditor from '../components/CodeEditor';
import OutputPanel from '../components/OutputPanel';
import VersionHistory from '../components/VersionHistory';
import ShareModal from '../components/ShareModal';
import { Button, Modal, Spinner } from '../components/ui';
import { useAuth } from '../auth';
import { useChatContext } from '../context/ChatContext';
import { collaboratorApi, fileApi, projectApi } from '../api';
import { getSocket } from '../socket';
import { WORKSPACES } from '../workspaceMeta';
import { acceptAttr, isAllowedFile, notAllowedMessage } from '../workspaceRules';
import {
  KEY_ACTIONS,
  eventToCombo,
  formatCombo,
  resolveBindings,
} from '../keybindings';
import type { FileNode, Project } from '../types';

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB per file

interface Peer {
  userId: string;
  email: string;
}

const AVATAR_COLORS = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500'];
function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

type SaveState = 'idle' | 'saving' | 'saved';

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const { openChat, setChatProject } = useChatContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [showOutput, setShowOutput] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const active = files.find((f) => f._id === activeId) ?? null;

  const reloadFiles = useCallback(async () => {
    if (!id) return;
    const fresh = await fileApi.list(id);
    setFiles(fresh);
  }, [id]);

  // Keep the global chat's onFilesChanged in sync whenever reloadFiles changes.
  useEffect(() => {
    if (project) setChatProject(project._id, reloadFiles);
  }, [project, reloadFiles, setChatProject]);

  // Initial load (joining first if arriving via a share link).
  useEffect(() => {
    if (!id) return;
    const joinToken = searchParams.get('join');
    (async () => {
      if (joinToken) {
        try {
          await collaboratorApi.join(id, joinToken);
        } catch {
          /* link inactive — the get below will 403 and redirect */
        }
        searchParams.delete('join');
        setSearchParams(searchParams, { replace: true });
      }
      try {
        const { project, files } = await projectApi.get(id);
        setProject(project);
        setFiles(files);
        const firstFile = files.find((f) => !f.isFolder);
        setActiveId(firstFile?._id ?? null);
        // Register this project with the global chat (opens drawer automatically on editor pages).
        openChat(project._id, reloadFiles);
      } catch {
        nav('/');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
    // Live keystroke updates from collaborators — apply to the matching file.
    const onLiveChange = (data: { fileId: string; content: string }) => {
      setFiles((prev) => prev.map((f) => (f._id === data.fileId ? { ...f, content: data.content } : f)));
    };
    socket.on('editor:change', onLiveChange);
    // Presence (who else is in this project).
    const onPresence = (data: { members: Peer[] }) => setPeers(data.members);
    socket.on('presence:sync', onPresence);
    return () => {
      socket.emit('project:leave', id);
      socket.off('file:created', refetch);
      socket.off('file:deleted', refetch);
      socket.off('file:renamed', refetch);
      socket.off('files:bulk-changed', refetch);
      socket.off('file:updated');
      socket.off('editor:change', onLiveChange);
      socket.off('presence:sync', onPresence);
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
    const bindings = resolveBindings(user?.preferences?.keybindings);
    const actions: Record<string, () => void> = {
      run: runProject,
      save: saveNow,
      toggleOutput: () => setShowOutput((s) => !s),
      focusChat: () => { openChat(); setTimeout(() => document.getElementById('cb-chat-input')?.focus(), 50); },
      nextFile: () => cycleFile(1),
      prevFile: () => cycleFile(-1),
    };
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      const combo = eventToCombo(e);
      if (combo) {
        for (const [actionId, binding] of Object.entries(bindings)) {
          if (binding === combo && actions[actionId]) {
            e.preventDefault();
            actions[actionId]();
            return;
          }
        }
      }
      if (e.key === '?' && !typing) {
        e.preventDefault();
        setShowShortcuts((s) => !s);
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, activeId, id, active?.content, user?.preferences?.keybindings]);

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
  const isOwner = !!user && project.owner === user._id;

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

        {peers.length > 1 && (
          <div className="ml-auto flex items-center gap-2" title={`${peers.length} active session(s)`}>
            <div className="flex -space-x-2">
              {peers.slice(0, 4).map((p, i) => (
                <span
                  key={i}
                  title={p.email}
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface text-[10px] font-semibold text-white ${avatarColor(
                    p.email || p.userId,
                  )}`}
                >
                  {(p.email || '?').charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
            <span className="text-xs text-slate-400">{peers.length} here</span>
          </div>
        )}
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
              {isOwner && (
                <Button variant="ghost" className="!py-1 !px-2 text-xs" onClick={() => setShowShare(true)} title="Share project">
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              )}
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
                <CodeEditor
                  projectId={project._id}
                  path={active.path}
                  value={active.content}
                  onChange={handleChange}
                />
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

        {/* Chat is rendered globally in AppLayout's GlobalChatDrawer */}
      </div>

      {showHistory && active && id && (
        <VersionHistory
          projectId={id}
          file={active}
          onClose={() => setShowHistory(false)}
          onRestored={reloadFiles}
        />
      )}

      {showShare && id && <ShareModal projectId={id} onClose={() => setShowShare(false)} />}

      <Modal open={showShortcuts} onClose={() => setShowShortcuts(false)} title="Keyboard shortcuts">
        <ul className="space-y-2 text-sm">
          {KEY_ACTIONS.map((a) => (
            <li key={a.id} className="flex items-center justify-between">
              <span className="text-slate-600">{a.label}</span>
              <kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                {formatCombo(resolveBindings(user?.preferences?.keybindings)[a.id])}
              </kbd>
            </li>
          ))}
          <li className="flex items-center justify-between">
            <span className="text-slate-600">Show this help</span>
            <kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">?</kbd>
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">Customize these in Settings → Keyboard shortcuts.</p>
      </Modal>
    </div>
  );
}
