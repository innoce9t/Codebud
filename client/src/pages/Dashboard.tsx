import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, FolderGit2, Plus } from 'lucide-react';
import { PageHeader, Button, Spinner } from '../components/ui';
import { WORKSPACES } from '../workspaceMeta';
import { aiApi, projectApi } from '../api';
import type { Project } from '../types';
import { useAuth } from '../auth';

export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [activeModelName, setActiveModelName] = useState<string | null>(null);

  useEffect(() => {
    projectApi.list().then(setProjects);
    aiApi
      .catalog()
      .then((c) => {
        const m = c.providers.flatMap((p) => p.models).find((m) => m.id === c.activeModel);
        setActiveModelName(m ? m.name : null);
      })
      .catch(() => setActiveModelName(null));
  }, []);

  const counts: Record<string, number> = {};
  for (const p of projects ?? []) counts[p.type] = (counts[p.type] ?? 0) + 1;
  const recent = (projects ?? []).slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name}` : ''}`}
        subtitle="An overview of your projects and connected services."
        action={
          <Button onClick={() => nav('/new')}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <FolderGit2 className="h-4 w-4" />
            <span className="text-sm">Total projects</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{projects?.length ?? '—'}</p>
        </div>
        {Object.values(WORKSPACES).map((w) => {
          const Icon = w.Icon;
          return (
            <button
              key={w.type}
              onClick={() => nav(`/workspace/${w.type}`)}
              className="rounded-2xl border border-slate-200 bg-surface p-5 text-left shadow-sm transition hover:border-brand-300"
            >
              <div className={`flex items-center gap-2 ${w.accent}`}>
                <Icon className="h-4 w-4" />
                <span className="text-sm text-slate-500">{w.title.replace(' Workspace', '')}</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">{counts[w.type] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* AI status */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-brand-600" />
            <span className="font-semibold text-slate-900">AI model</span>
          </div>
          <button onClick={() => nav('/ai-models')} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
            Manage <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {activeModelName ? (
            <>
              Active model: <span className="font-medium text-slate-800">{activeModelName}</span>
            </>
          ) : (
            <>
              No model selected — using the default assistant.{' '}
              <button onClick={() => nav('/ai-models')} className="font-medium text-brand-600 hover:underline">
                Connect a provider
              </button>
            </>
          )}
        </p>
      </div>

      {/* Recent projects */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent projects</h2>
          {(projects?.length ?? 0) > 0 && (
            <button onClick={() => nav('/workspaces')} className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {projects === null ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-7 w-7" />
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-surface py-14 text-center">
            <p className="text-slate-500">No projects yet.</p>
            <Button className="mt-4" onClick={() => nav('/new')}>
              <Plus className="h-4 w-4" /> Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => {
              const w = WORKSPACES[p.type];
              const Icon = w.Icon;
              return (
                <button
                  key={p._id}
                  onClick={() => nav(`/project/${p._id}`)}
                  className="rounded-xl border border-slate-200 bg-surface p-5 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${w.iconBg}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="truncate font-semibold text-slate-900">{p.name}</h3>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{p.description || 'No description'}</p>
                  <p className="mt-3 text-xs text-slate-400">
                    Updated {new Date(p.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
