import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useResizable } from '../hooks/useResizable';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft, Bot, Brain, Check, ChevronDown, MessageCircle,
  Pencil, Plus, RotateCcw, Send, ShieldCheck, ShieldOff, Sparkles, Trash2, X, FolderPlus, Moon, Palette,
} from 'lucide-react';
import { useChatContext, type ChatMode } from '../context/ChatContext';
import { useAuth } from '../auth';
import { aiApi, sessionApi, type SessionMeta } from '../api';
import { useConfirm } from './ConfirmProvider';
import { Spinner } from './ui';
import { projectApi, collaboratorApi } from '../api';
import type { AiCatalog, ChatMessage, ProjectType } from '../types';
import { formatDistanceToNow } from '../utils/time';

// ── Mode config ─────────────────────────────────────────────
const MODES: { id: ChatMode; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'ask', label: 'Ask', Icon: MessageCircle },
  { id: 'plan', label: 'Plan', Icon: Brain },
  { id: 'agent', label: 'Agent', Icon: Sparkles },
];

export default function GlobalChatDrawer() {
  const {
    chatOpen, activeSessionId, currentProjectId, onFilesChanged,
    drawerWidth: ctxWidth, setDrawerWidth,
    closeChat, setActiveSession, setChatMode,
  } = useChatContext();
  const { user, updateProfile } = useAuth();
  const nav = useNavigate();
  const confirm = useConfirm();

  const inProject = !!currentProjectId;

  const [view, setView] = useState<'sessions' | 'chat'>('sessions');
  const [sessions, setSessions] = useState<SessionMeta[] | null>(null);
  const [generalSessionId, setGeneralSessionId] = useState<string | null>(null);
  const [resetCounter, setResetCounter] = useState(0);
  const [catalog, setCatalog] = useState<AiCatalog | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const { width: drawerWidth, handleMouseDown: handleDrawerResize } = useResizable({
    defaultWidth: ctxWidth,
    min: 240,
    max: 600,
    storageKey: 'cb-chat-width',
    direction: 'left',
  });

  // Keep context in sync so AppLayout can offset the pull tab.
  useEffect(() => {
    setDrawerWidth(drawerWidth);
  }, [drawerWidth, setDrawerWidth]);

  const hasModel = !!user?.activeModel;

  // Load the right data when the drawer opens: project sessions list, or the
  // single general session for free-roaming chat.
  useEffect(() => {
    if (!chatOpen || !hasModel) return;
    aiApi.catalog().then(setCatalog);
    if (inProject) {
      sessionApi.list(currentProjectId!).then(setSessions);
    } else {
      sessionApi.general().then((s) => setGeneralSessionId(s._id));
    }
  }, [chatOpen, hasModel, inProject, currentProjectId]);

  // Project sessions always start at the list when the project changes.
  useEffect(() => {
    setView('sessions');
  }, [currentProjectId]);

  if (!chatOpen) return null;

  // ── No AI model ────────────────────────────────────────────
  if (!hasModel) {
    return (
      <DrawerShell width={drawerWidth} onDragHandle={handleDrawerResize} onClose={closeChat}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Bot className="h-7 w-7 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">No AI model connected</p>
            <p className="mt-1 text-sm text-slate-400">Connect a provider to start chatting.</p>
          </div>
          <button
            onClick={() => { closeChat(); nav('/ai-models'); }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Go to AI Models
          </button>
        </div>
      </DrawerShell>
    );
  }

  const connectedModels =
    catalog?.providers.flatMap((p) => (p.connected ? p.models.map((m) => ({ ...m, providerName: p.name })) : [])) ?? [];
  const activeModelName =
    catalog?.providers.flatMap((p) => p.models).find((m) => m.id === catalog?.activeModel)?.name ??
    user?.activeModel ?? '';

  async function changeModel(modelId: string) {
    await aiApi.setActive(modelId);
    const fresh = await aiApi.catalog();
    setCatalog(fresh);
  }

  function manageModels() {
    closeChat();
    nav('/ai-models');
  }

  async function newSession() {
    const session = await sessionApi.create(inProject ? { projectId: currentProjectId! } : {});
    setSessions((s) => [session, ...(s ?? [])]);
    setActiveSession(session._id);
    setView('chat');
  }

  async function deleteSession(id: string) {
    const ok = await confirm({
      title: 'Delete conversation',
      message: 'Delete this conversation and all its messages? This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await sessionApi.remove(id);
    setSessions((s) => s?.filter((x) => x._id !== id) ?? []);
    if (activeSessionId === id) setView('sessions');
  }

  async function resetGeneral() {
    if (!generalSessionId) return;
    const ok = await confirm({
      title: 'Reset chat',
      message: 'Clear this conversation? All messages will be removed.',
      confirmLabel: 'Reset',
      danger: true,
    });
    if (!ok) return;
    await sessionApi.clearMessages(generalSessionId);
    setResetCounter((c) => c + 1);
  }

  // Verify a project id the AI handed us actually belongs to the user before acting on it.
  // Defense-in-depth against prompt injection: even though the server enforces ownership on
  // destructive calls, we never act on an id the user doesn't own/collaborate on.
  async function resolveOwnedProjectId(id: string): Promise<string | null> {
    const clean = id.trim();
    if (!clean) return null;
    try {
      const projects = await projectApi.list();
      return projects.some((p) => p._id === clean) ? clean : null;
    } catch {
      return null;
    }
  }

  async function handleAction(actionName: string, param: string) {
    try {
      if (actionName === 'changeTheme') {
        // param is: light|dark|system
        await updateProfile({
          preferences: { theme: { mode: param as 'light' | 'dark' | 'system' } },
        });
      } else if (actionName === 'changeAccent') {
        // param is: indigo|violet|blue|sky|emerald|amber|rose|graphite
        await updateProfile({
          preferences: { theme: { accent: param } },
        });
      } else if (actionName === 'createProject') {
        // param is: type:name:description (where description can contain colons)
        const parts = param.split(':');
        const type = parts[0] as ProjectType;
        const name = parts[1];
        const description = parts.slice(2).join(':') || undefined;

        if (!type || !name) {
          console.error('createProject: missing type or name');
          return;
        }

        const project = await projectApi.create({ type, name, description });
        nav(`/project/${project._id}`);
      } else if (actionName === 'openProject') {
        // param is the project id
        const id = await resolveOwnedProjectId(param);
        if (!id) { console.error('openProject: unknown project'); return; }
        nav(`/project/${id}`);
      } else if (actionName === 'renameProject') {
        // param is: projectId:newName (name may contain colons)
        const idx = param.indexOf(':');
        if (idx === -1) return;
        const id = await resolveOwnedProjectId(param.slice(0, idx));
        const name = param.slice(idx + 1).trim();
        if (!id || !name) { console.error('renameProject: invalid id or name'); return; }
        await projectApi.update(id, { name });
      } else if (actionName === 'deleteProject') {
        // param is the project id — always route through the confirm modal.
        const id = await resolveOwnedProjectId(param);
        if (!id) { console.error('deleteProject: unknown project'); return; }
        const ok = await confirm({
          title: 'Delete project',
          message: 'Delete this project and all of its files and chat history? This cannot be undone.',
          confirmLabel: 'Delete',
          danger: true,
        });
        if (!ok) return;
        await projectApi.remove(id);
      } else if (actionName === 'shareProject') {
        // param is the project id — confirm, then enable link sharing and copy the link.
        const id = await resolveOwnedProjectId(param);
        if (!id) { console.error('shareProject: unknown project'); return; }
        const ok = await confirm({
          title: 'Share project by link',
          message: 'Enable "anyone with the link" access? Anyone who has the link will be able to open and edit this project until you disable sharing.',
          confirmLabel: 'Enable link sharing',
        });
        if (!ok) return;
        const res = await collaboratorApi.setLinkSharing(id, true);
        if (res.shareToken) {
          const url = `${window.location.origin}/project/${id}?join=${res.shareToken}`;
          try {
            await navigator.clipboard.writeText(url);
          } catch {
            // Clipboard may be blocked; sharing is still enabled.
          }
        }
      } else if (actionName === 'setEditor') {
        // param is: setting:value (e.g. wordWrap:true, fontSize:16)
        const [key, rawValue] = param.split(':');
        if (!key || rawValue === undefined) return;
        const boolKeys = ['wordWrap', 'minimap', 'aiCompletions'];
        const numKeys = ['fontSize', 'tabSize'];
        let value: boolean | number;
        if (boolKeys.includes(key)) {
          value = rawValue.trim().toLowerCase() === 'true';
        } else if (numKeys.includes(key)) {
          value = Number(rawValue);
          if (Number.isNaN(value)) return;
        } else {
          return;
        }
        await updateProfile({ preferences: { editor: { [key]: value } } });
      }
    } catch (err) {
      console.error('Action failed:', err);
    }
  }

  async function startRename(id: string, current: string) {
    setRenaming(id);
    setRenameValue(current);
  }

  async function commitRename(id: string) {
    const title = renameValue.trim();
    if (title) {
      const updated = await sessionApi.rename(id, title);
      setSessions((s) => s?.map((x) => (x._id === id ? updated : x)) ?? []);
    }
    setRenaming(null);
  }

  // ── General mode (not in a project): one simple chat + reset ─
  if (!inProject) {
    return (
      <DrawerShell width={drawerWidth} onDragHandle={handleDrawerResize} onClose={closeChat}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Bot className="h-4 w-4 text-brand-600" /> AI Chat
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={resetGeneral}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              title="Reset conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button onClick={closeChat} className="rounded p-1 text-slate-400 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {generalSessionId ? (
          <ActiveChat
            key={`${generalSessionId}-${resetCounter}`}
            sessionId={generalSessionId}
            catalog={catalog}
            connectedModels={connectedModels}
            activeModelName={activeModelName}
            onChangeModel={changeModel}
            onManageModels={manageModels}
            onAction={handleAction}
          />
        ) : (
          <div className="flex flex-1 justify-center pt-10"><Spinner /></div>
        )}
      </DrawerShell>
    );
  }

  // ── Project sessions list view ─────────────────────────────
  if (view === 'sessions') {
    return (
      <DrawerShell width={drawerWidth} onDragHandle={handleDrawerResize} onClose={closeChat}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Bot className="h-4 w-4 text-brand-600" /> Project Sessions
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={newSession}
              className="flex items-center gap-1 rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
            <button onClick={closeChat} className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-auto">
          {sessions === null ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <MessageCircle className="h-8 w-8 text-slate-400 dark:text-slate-600" />
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No conversations yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Start a new session to chat with AI</p>
              </div>
              <button
                onClick={newSession}
                className="mt-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Start conversation
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
              {sessions.map((s) => (
                <li
                  key={s._id}
                  className={`group flex items-start gap-2 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700/50 ${
                    activeSessionId === s._id ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                  }`}
                >
                  {/* Dot indicator for active */}
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activeSessionId === s._id ? 'bg-brand-500' : 'bg-transparent'}`} />

                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => { setActiveSession(s._id); setView('chat'); }}
                  >
                    {renaming === s._id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(s._id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitRename(s._id); if (e.key === 'Escape') setRenaming(null); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded border border-brand-300 bg-surface px-1.5 py-0.5 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    ) : (
                      <>
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{s.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{formatDistanceToNow(s.updatedAt)}</p>
                      </>
                    )}
                  </button>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => startRename(s._id, s.title)} className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" title="Rename">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteSession(s._id)} className="rounded p-1 text-slate-400 hover:text-red-500" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DrawerShell>
    );
  }

  // ── Active chat view ───────────────────────────────────────
  return (
    <DrawerShell width={drawerWidth} onDragHandle={handleDrawerResize} onClose={closeChat}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-2 py-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setView('sessions')} className="rounded p-1 text-slate-400 hover:text-slate-700" title="All sessions">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-slate-600">
            {sessions?.find((s) => s._id === activeSessionId)?.title ?? 'Chat'}
          </span>
        </div>
        <button onClick={closeChat} className="rounded p-1 text-slate-400 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages + bottom controls */}
      {activeSessionId && (
        <ActiveChat
          sessionId={activeSessionId}
          catalog={catalog}
          connectedModels={connectedModels}
          activeModelName={activeModelName}
          onChangeModel={changeModel}
          onManageModels={manageModels}
          onFilesChanged={onFilesChanged ?? undefined}
          onTitleChange={(title) =>
            setSessions((s) => s?.map((x) => (x._id === activeSessionId ? { ...x, title } : x)) ?? [])
          }
          // Intentionally NO onAction: app-level actions (delete/rename/share/theme) are a
          // general-chat feature only. Project chat ingests file content that collaborators can
          // control, so wiring actions here would be a prompt-injection vector. Navigation (handled
          // internally) stays, as it is documented in the project prompt and low-risk.
        />
      )}
    </DrawerShell>
  );
}

// ── DrawerShell ─────────────────────────────────────────────
function DrawerShell({
  children,
  width,
  onDragHandle,
  onClose,
}: {
  children: React.ReactNode;
  width: number;
  onDragHandle: (e: React.MouseEvent) => void;
  onClose: () => void;
}) {
  return (
    <aside className="relative flex h-full shrink-0 flex-col border-l border-slate-200 bg-surface" style={{ width }}>
      {/* Left-edge drag handle */}
      <div
        onMouseDown={onDragHandle}
        className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-brand-400/40 active:bg-brand-500/60 transition-colors z-10"
        title="Drag to resize"
      />
      {children}
    </aside>
  );
}

// Hidden directives the AI uses to perform actions, e.g. [[navigate:/workspaces]], [[action:changeTheme:dark]]
const NAV_DIRECTIVE = /\[\[navigate:(\/[^\]\s]*)\]\]/i;
const ACTION_DIRECTIVE = /\[\[action:([^\]:]+):([^\]]+)\]\]/i;

function stripDirectives(content: string): string {
  return content
    .replace(/\[\[navigate:[^\]]*\]\]/gi, '')
    .replace(/\[\[action:[^\]]*\]\]/gi, '')
    .trim();
}

interface ConnectedModel { id: string; name: string; providerName: string }

// ── ActiveChat ───────────────────────────────────────────────
function ActiveChat({
  sessionId,
  catalog,
  connectedModels,
  activeModelName,
  onChangeModel,
  onManageModels,
  onFilesChanged,
  onTitleChange,
  onAction,
}: {
  sessionId: string;
  catalog: AiCatalog | null;
  connectedModels: ConnectedModel[];
  activeModelName: string;
  onChangeModel: (modelId: string) => void;
  onManageModels: () => void;
  onFilesChanged?: () => void;
  onTitleChange?: (title: string) => void;
  onAction?: (name: string, param: string) => void;
}) {
  const nav = useNavigate();
  const { chatMode, approvalMode, setChatMode, setApprovalMode } = useChatContext();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Project sessions get the full toolbar (model/mode/approval); general chat stays simple.
  const isProjectSession = !!sessionMeta?.project;
  const mode: ChatMode = isProjectSession ? chatMode : 'ask';
  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[0];

  useEffect(() => {
    setMessages(null);
    setSessionMeta(null);
    sessionApi.messages(sessionId).then(({ messages: msgs, session }) => {
      setMessages(msgs);
      setSessionMeta(session);
    });
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  function patchMessage(id: string, patch: Partial<ChatMessage>) {
    setMessages((m) => m?.map((x) => (x._id === id ? { ...x, ...patch } : x)) ?? []);
  }

  async function approveEdits(msgId: string) {
    const res = await sessionApi.applyEdits(sessionId, msgId);
    patchMessage(msgId, res.message);
    if (res.applied.length) onFilesChanged?.();
  }

  async function rejectEdits(msgId: string) {
    const res = await sessionApi.rejectEdits(sessionId, msgId);
    patchMessage(msgId, res.message);
  }

  // Execute directives the AI emitted (navigation or actions).
  function handleDirectives(content: string) {
    const navMatch = content.match(NAV_DIRECTIVE);
    if (navMatch) setTimeout(() => nav(navMatch[1]), 300);

    const actionMatch = content.match(ACTION_DIRECTIVE);
    if (actionMatch) {
      const actionName = actionMatch[1];
      const param = actionMatch[2];
      onAction?.(actionName, param);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    const optimistic: ChatMessage = {
      _id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...(m ?? []), optimistic]);
    try {
      const res = await sessionApi.send(sessionId, text, mode, approvalMode);
      setMessages((m) =>
        [...(m ?? []).filter((x) => x._id !== optimistic._id), res.userMessage, res.assistantMessage],
      );
      if (res.edits.length) onFilesChanged?.();
      if (res.session.title !== 'New conversation') onTitleChange?.(res.session.title);
      handleDirectives(res.assistantMessage.content);
    } catch (err) {
      setMessages((m) => [
        ...(m ?? []).filter((x) => x._id !== optimistic._id),
        {
          _id: `err-${Date.now()}`,
          role: 'assistant',
          content: `${(err as Error).message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto p-3">
        {messages === null ? (
          <div className="flex justify-center pt-8"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="px-2 pt-8 text-center">
            <MessageCircle className="mx-auto mb-3 h-7 w-7 text-slate-300" />
            <p className="mb-6 text-sm text-slate-400">
              {!isProjectSession
                ? 'Ask me anything — I can guide you around the app, explain features, or help you create a project.'
                : mode === 'agent'
                ? "Describe what to build — I'll handle it end-to-end."
                : mode === 'plan'
                ? "Describe your goal — I'll plan before making any changes."
                : 'Ask anything about your code or navigate the app.'}
            </p>
            {!isProjectSession && (
              <div className="space-y-2">
                <button
                  onClick={() => setInput('Create a new JavaScript project')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
                >
                  <FolderPlus className="h-4 w-4" /> Create a new project
                </button>
                <button
                  onClick={() => setInput('Switch to dark mode')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
                >
                  <Moon className="h-4 w-4" /> Change light/dark mode
                </button>
                <button
                  onClick={() => setInput('Change the theme color')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition"
                >
                  <Palette className="h-4 w-4" /> Change theme colors
                </button>
              </div>
            )}
          </div>
        ) : (
          messages.map((m) => (
            <Bubble
              key={m._id}
              msg={m}
              nav={nav}
              onApprove={() => approveEdits(m._id)}
              onReject={() => rejectEdits(m._id)}
            />
          ))
        )}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Spinner /> {mode === 'agent' ? 'Working…' : mode === 'plan' ? 'Planning…' : 'Thinking…'}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 p-2">
        {/* Project-only controls: model + mode inline, approval radios */}
        {isProjectSession && (
          <div className="mb-2 space-y-2">
            <div className="flex items-center gap-1.5">
              {/* Model dropdown (opens upward) */}
              <div className="relative flex-1">
                <button
                  onClick={() => { setModelOpen((o) => !o); setModeOpen(false); }}
                  className="flex w-full items-center justify-between gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300"
                  title="Active AI model"
                >
                  <span className="truncate">{activeModelName || 'No model'}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>
                {modelOpen && (
                  <div className="absolute bottom-full left-0 right-0 z-50 mb-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-surface py-1 shadow-lg">
                    {connectedModels.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-400">No models connected.</p>
                    ) : (
                      connectedModels.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { onChangeModel(m.id); setModelOpen(false); }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-slate-100 ${
                            m.id === catalog?.activeModel ? 'font-semibold text-brand-700' : 'text-slate-700'
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate text-left">{m.name}</span>
                          {m.id === catalog?.activeModel && (
                            <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">Active</span>
                          )}
                        </button>
                      ))
                    )}
                    <div className="border-t border-slate-100 px-3 py-1.5">
                      <button onClick={onManageModels} className="text-xs text-brand-600 hover:underline">
                        Manage AI Models →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mode dropdown (opens upward) */}
              <div className="relative flex-1">
                <button
                  onClick={() => { setModeOpen((o) => !o); setModelOpen(false); }}
                  className="flex w-full items-center justify-between gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300"
                  title="Chat mode"
                >
                  <span className="flex items-center gap-1 truncate">
                    <currentMode.Icon className="h-3 w-3" />{currentMode.label}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </button>
                {modeOpen && (
                  <div className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-lg border border-slate-200 bg-surface py-1 shadow-lg">
                    {MODES.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        onClick={() => { setChatMode(id); setModeOpen(false); }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-slate-100 ${
                          chatMode === id ? 'font-semibold text-brand-700' : 'text-slate-700'
                        }`}
                      >
                        <Icon className="h-3 w-3" /> {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Approval radios — only in Agent mode */}
            {mode === 'agent' && (
              <div className="flex items-center gap-4 px-0.5 text-xs text-slate-600">
                <span className="font-medium text-slate-500">Approval:</span>
                <label className="flex cursor-pointer items-center gap-1">
                  <input
                    type="radio"
                    name="approval"
                    checked={approvalMode === 'auto'}
                    onChange={() => setApprovalMode('auto')}
                    className="accent-brand-600"
                  />
                  <ShieldOff className="h-3 w-3" /> Auto
                </label>
                <label className="flex cursor-pointer items-center gap-1">
                  <input
                    type="radio"
                    name="approval"
                    checked={approvalMode === 'review'}
                    onChange={() => setApprovalMode('review')}
                    className="accent-brand-600"
                  />
                  <ShieldCheck className="h-3 w-3" /> Review
                </label>
              </div>
            )}
          </div>
        )}

        {/* Click-away backdrop for the dropdowns */}
        {(modelOpen || modeOpen) && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setModelOpen(false); setModeOpen(false); }}
          />
        )}

        <form onSubmit={send}>
          <div className="flex items-end gap-2">
            <textarea
              id="cb-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
              rows={2}
              placeholder={
                !isProjectSession ? 'Ask me anything… (Enter to send)'
                : mode === 'agent' ? 'Describe what to build…'
                : mode === 'plan' ? 'Describe your goal…'
                : 'Ask the AI… (Enter to send)'
              }
              className="flex-1 resize-none rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex items-center justify-center rounded-lg bg-brand-600 p-2.5 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 px-1 text-[10px] text-slate-400">
            {isProjectSession ? `${currentMode.label} mode · ` : ''}Enter to send, Shift+Enter for newline
          </p>
        </form>
      </div>
    </>
  );
}

// ── Message bubble ───────────────────────────────────────────
function Bubble({
  msg,
  nav,
  onApprove,
  onReject,
}: {
  msg: ChatMessage;
  nav: ReturnType<typeof useNavigate>;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const isUser = msg.role === 'user';
  const hasPending = !!msg.pendingEdits?.length;
  const [acting, setActing] = useState(false);

  async function handle(fn?: () => void | Promise<void>) {
    if (!fn) return;
    setActing(true);
    try { await fn(); } finally { setActing(false); }
  }

  return (
    <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-sm ${
          isUser ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown
              components={{
                a: ({ href, children }) =>
                  href?.startsWith('/') ? (
                    <button className="text-brand-600 underline hover:text-brand-700" onClick={() => nav(href)}>
                      {children}
                    </button>
                  ) : (
                    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                  ),
              }}
            >
              {stripDirectives(msg.content)}
            </ReactMarkdown>
            {msg.edits && msg.edits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {msg.edits.map((e, i) => (
                  <span key={i} className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                    <Check className="inline h-2.5 w-2.5 mr-0.5" />{e.action} {e.path}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending edits approval card */}
      {hasPending && msg.editsApproved == null && (
        <div className="w-full max-w-[92%] rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs">
          <div className="mb-2 flex items-center gap-1.5 font-semibold text-amber-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Proposed file edits — review before applying
          </div>
          <ul className="mb-3 space-y-1">
            {msg.pendingEdits!.map((e, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md bg-white px-2 py-1 font-mono text-[11px] text-slate-700 border border-slate-100">
                <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold uppercase ${
                  e.action === 'create' ? 'bg-emerald-100 text-emerald-700'
                  : e.action === 'delete' ? 'bg-red-100 text-red-600'
                  : 'bg-blue-100 text-blue-700'
                }`}>{e.action}</span>
                <span className="truncate">{e.path}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              disabled={acting}
              onClick={() => handle(onApprove)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Apply
            </button>
            <button
              disabled={acting}
              onClick={() => handle(onReject)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        </div>
      )}

      {/* Settled state badges */}
      {hasPending && msg.editsApproved === true && (
        <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <Check className="h-3 w-3" /> Edits applied
        </div>
      )}
      {!hasPending && msg.editsApproved === false && (
        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <X className="h-3 w-3" /> Edits rejected
        </div>
      )}
    </div>
  );
}
