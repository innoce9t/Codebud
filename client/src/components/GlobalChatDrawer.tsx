import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Brain, ChevronRight, ChevronDown, LayoutGrid, MessageCircle, Sparkles, Trash2, X,
} from 'lucide-react';
import { useChatContext, type ChatMode } from '../context/ChatContext';
import { useAuth } from '../auth';
import { aiApi, chatApi, projectApi } from '../api';
import ChatPanel from './ChatPanel';
import { Spinner } from './ui';
import type { AiCatalog, Project } from '../types';

// ── Mode config ─────────────────────────────────────────────
const MODES: { id: ChatMode; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'ask', label: 'Ask', Icon: MessageCircle },
  { id: 'plan', label: 'Plan', Icon: Brain },
  { id: 'agent', label: 'Agent', Icon: Sparkles },
];

export default function GlobalChatDrawer() {
  const { chatOpen, chatProjectId, chatMode, onFilesChanged, closeChat, setChatProject, setChatMode } =
    useChatContext();
  const { user, refreshUser } = useAuth();
  const nav = useNavigate();

  const [picking, setPicking] = useState(false);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [catalog, setCatalog] = useState<AiCatalog | null>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [clearBusy, setClearBusy] = useState(false);

  const hasModel = !!user?.activeModel;

  // Load project list for picker.
  useEffect(() => {
    if (chatOpen && !chatProjectId) {
      projectApi.list().then(setProjects);
      setPicking(true);
    }
    if (chatProjectId) setPicking(false);
  }, [chatOpen, chatProjectId]);

  // Load AI catalog when drawer is open and user has a model.
  useEffect(() => {
    if (chatOpen && hasModel) {
      aiApi.catalog().then(setCatalog);
    }
  }, [chatOpen, hasModel]);

  if (!chatOpen) return null;

  // ── No AI model ────────────────────────────────────────────
  if (!hasModel) {
    return (
      <NoModelState onGoToModels={() => { closeChat(); nav('/ai-models'); }} onClose={closeChat} />
    );
  }

  // All connected models (flat list).
  const connectedModels =
    catalog?.providers.flatMap((p) => (p.connected ? p.models.map((m) => ({ ...m, provider: p.name })) : [])) ?? [];
  const activeModel =
    catalog?.providers.flatMap((p) => p.models).find((m) => m.id === catalog?.activeModel);

  async function changeModel(modelId: string) {
    await aiApi.setActive(modelId);
    await refreshUser();
    const fresh = await aiApi.catalog();
    setCatalog(fresh);
    setModelOpen(false);
  }

  async function clearHistory() {
    if (!chatProjectId) return;
    if (!confirm('Clear chat history for this project?')) return;
    setClearBusy(true);
    await chatApi.clear(chatProjectId).finally(() => setClearBusy(false));
    // Re-mount ChatPanel by forcing a key change via a small trick:
    // We can just use window.location.reload() but a cleaner approach is
    // to remount the panel — we set chatProjectId to itself with a signal.
    setChatProject(chatProjectId, onFilesChanged ?? undefined);
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-surface">
      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Bot className="h-4 w-4 text-brand-600" /> AI Chat
        </span>
        <div className="flex items-center gap-1">
          {chatProjectId && !picking && (
            <>
              {clearBusy ? (
                <Spinner />
              ) : (
                <button
                  onClick={clearHistory}
                  className="rounded p-1 text-slate-400 hover:text-red-500"
                  title="Clear chat history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => { setPicking(true); projectApi.list().then(setProjects); }}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
                title="Switch project"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button onClick={closeChat} className="rounded p-1 text-slate-400 hover:text-slate-700" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Controls bar (model picker + mode tabs) ──── */}
      {!picking && chatProjectId && (
        <div className="border-b border-slate-200 px-3 py-2 space-y-2">
          {/* Model picker */}
          <div className="relative">
            <button
              onClick={() => setModelOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-300"
            >
              <span className="truncate">{activeModel?.name ?? user?.activeModel ?? 'No model'}</span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>
            {modelOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-surface py-1 shadow-lg">
                {connectedModels.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-400">No models connected.</p>
                ) : (
                  connectedModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => changeModel(m.id)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-slate-100 ${
                        m.id === catalog?.activeModel ? 'font-semibold text-brand-700' : 'text-slate-700'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate text-left">{m.name}</span>
                      {m.id === catalog?.activeModel && (
                        <span className="shrink-0 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                          Active
                        </span>
                      )}
                    </button>
                  ))
                )}
                <div className="border-t border-slate-100 px-3 py-2">
                  <button
                    onClick={() => { closeChat(); nav('/ai-models'); }}
                    className="w-full text-left text-xs text-brand-600 hover:underline"
                  >
                    Manage AI Models →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mode tabs */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
            {MODES.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setChatMode(id)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1 font-medium transition ${
                  chatMode === id
                    ? 'bg-surface text-brand-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Body: picker or chat ─────────────────────── */}
      {picking || !chatProjectId ? (
        <ProjectPicker
          projects={projects}
          onPick={(id) => { setChatProject(id); setPicking(false); }}
        />
      ) : (
        <div className="min-h-0 flex-1">
          <ChatPanel
            key={chatProjectId}
            projectId={chatProjectId}
            mode={chatMode}
            onFilesChanged={onFilesChanged ?? undefined}
            hideHeader
          />
        </div>
      )}
    </aside>
  );
}

// ── No model state ───────────────────────────────────────────
function NoModelState({ onGoToModels, onClose }: { onGoToModels: () => void; onClose: () => void }) {
  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-surface">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Bot className="h-4 w-4 text-brand-600" /> AI Chat
        </span>
        <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Bot className="h-7 w-7 text-slate-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-700">No AI model connected</p>
          <p className="mt-1 text-sm text-slate-400">
            Connect an AI provider and select a model to start chatting.
          </p>
        </div>
        <button
          onClick={onGoToModels}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Go to AI Models
        </button>
      </div>
    </aside>
  );
}

// ── Project picker ───────────────────────────────────────────
function ProjectPicker({ projects, onPick }: { projects: Project[] | null; onPick: (id: string) => void }) {
  if (!projects) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-400">
        <p>No projects yet.</p>
        <p className="text-xs">Create a project first to start chatting.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 overflow-auto p-3">
      <p className="mb-2 text-sm text-slate-500">Select a project to chat about:</p>
      {projects.map((p) => (
        <button
          key={p._id}
          onClick={() => onPick(p._id)}
          className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-800">{p.name}</span>
            <span className="capitalize text-xs text-slate-400">{p.type}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
        </button>
      ))}
    </div>
  );
}
