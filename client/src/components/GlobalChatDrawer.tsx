import { useEffect, useState } from 'react';
import { Bot, ChevronRight, LayoutGrid, X } from 'lucide-react';
import { useChatContext } from '../context/ChatContext';
import { projectApi } from '../api';
import ChatPanel from './ChatPanel';
import type { Project } from '../types';
import { WORKSPACES } from '../workspaceMeta';

export default function GlobalChatDrawer() {
  const { chatOpen, chatProjectId, onFilesChanged, closeChat, setChatProject } = useChatContext();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [picking, setPicking] = useState(false);

  // Load project list whenever we need the picker.
  useEffect(() => {
    if (chatOpen && !chatProjectId) {
      projectApi.list().then(setProjects);
      setPicking(true);
    } else {
      setPicking(false);
    }
  }, [chatOpen, chatProjectId]);

  if (!chatOpen) return null;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-slate-200 bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Bot className="h-4 w-4 text-brand-600" /> AI Chat
        </span>
        <div className="flex items-center gap-1">
          {chatProjectId && !picking && (
            <button
              onClick={() => {
                setProjects(null);
                setPicking(true);
                projectApi.list().then(setProjects);
              }}
              className="rounded p-1 text-slate-400 hover:text-slate-700"
              title="Switch project"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={closeChat} className="rounded p-1 text-slate-400 hover:text-slate-700" title="Close chat">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Project picker */}
      {picking || !chatProjectId ? (
        <ProjectPicker
          projects={projects}
          onPick={(id) => {
            setChatProject(id);
            setPicking(false);
          }}
        />
      ) : (
        <div className="min-h-0 flex-1">
          <ChatPanel
            projectId={chatProjectId}
            onFilesChanged={onFilesChanged ?? undefined}
            hideHeader
          />
        </div>
      )}
    </aside>
  );
}

function ProjectPicker({
  projects,
  onPick,
}: {
  projects: Project[] | null;
  onPick: (id: string) => void;
}) {
  if (!projects) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
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
      {projects.map((p) => {
        const meta = WORKSPACES[p.type];
        const Icon = meta?.Icon;
        return (
          <button
            key={p._id}
            onClick={() => onPick(p._id)}
            className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left hover:border-brand-300 hover:bg-brand-50 transition"
          >
            {Icon && (
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm ${meta.iconBg}`}>
                <Icon className="h-4 w-4" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-800">{p.name}</span>
              <span className="text-xs text-slate-400 capitalize">{p.type}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </button>
        );
      })}
    </div>
  );
}
