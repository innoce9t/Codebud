import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import FileExplorer from '../components/FileExplorer';
import CodeEditor from '../components/CodeEditor';
import ChatPanel from '../components/ChatPanel';
import OutputPanel from '../components/OutputPanel';
import VersionHistory from '../components/VersionHistory';
import { Button, Spinner } from '../components/ui';
import { fileApi, projectApi } from '../api';
import { getSocket } from '../socket';
import { WORKSPACES } from '../workspaceMeta';
import type { FileNode, Project } from '../types';

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

  async function createFile(path: string) {
    if (!id) return;
    try {
      const file = await fileApi.create(id, { path });
      await reloadFiles();
      setActiveId(file._id);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function deleteFile(file: FileNode) {
    if (!id || !confirm(`Delete ${file.path}?`)) return;
    await fileApi.remove(id, file._id);
    await reloadFiles();
    if (activeId === file._id) setActiveId(null);
  }

  async function renameFile(file: FileNode, newPath: string) {
    if (!id) return;
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

  return (
    <div className="flex h-screen flex-col">
      <TopBar>
        <span className="text-slate-600">/</span>
        <button onClick={() => nav(`/workspace/${project.type}`)} className="text-slate-400 hover:text-white">
          {meta.emoji} {meta.title.replace(' Workspace', '')}
        </button>
        <span className="text-slate-600">/</span>
        <span className="font-medium text-white">{project.name}</span>
        <span className="ml-3 text-xs text-slate-500">
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : ''}
        </span>
      </TopBar>

      <div className="flex min-h-0 flex-1">
        {/* Explorer */}
        <aside className="w-56 shrink-0 border-r border-slate-800">
          <FileExplorer
            files={files}
            activeId={activeId}
            onSelect={(f) => setActiveId(f._id)}
            onCreate={createFile}
            onDelete={deleteFile}
            onRename={renameFile}
          />
        </aside>

        {/* Editor + output */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-3 py-1.5">
            <span className="truncate text-sm text-slate-300">{active ? active.path : 'No file selected'}</span>
            <div className="flex items-center gap-2">
              {active && (
                <Button variant="ghost" className="!py-1 !px-2 text-xs" onClick={() => setShowHistory(true)}>
                  🕓 History
                </Button>
              )}
              <Button variant="ghost" className="!py-1 !px-2 text-xs" onClick={() => setShowOutput((s) => !s)}>
                {showOutput ? 'Hide' : 'Show'} {project.type === 'website' ? 'Preview' : 'Console'}
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              {active ? (
                <CodeEditor path={active.path} value={active.content} onChange={handleChange} />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-600">
                  Select or create a file to start editing.
                </div>
              )}
            </div>

            {showOutput && (
              <div className="h-2/5 min-h-[180px] border-t border-slate-800">
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
    </div>
  );
}
