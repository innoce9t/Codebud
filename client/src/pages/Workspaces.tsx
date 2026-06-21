import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus, Search, Trash2 } from 'lucide-react';
import { PageHeader, Button, Spinner } from '../components/ui';
import { WORKSPACE_LIST } from '../workspaceMeta';
import { projectApi } from '../api';
import { useConfirm } from '../components/ConfirmProvider';
import { useAuth } from '../auth';
import type { Project, ProjectType } from '../types';

export default function Workspaces() {
  const nav = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>('updated');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'mine' | 'shared'>('all');

  async function refresh() {
    setProjects(await projectApi.list());
  }
  useEffect(() => {
    refresh();
  }, []);

  // Apply search + owner filter + sort across all workspace groups.
  const visible = useMemo(() => {
    if (!projects) return null;
    const q = search.trim().toLowerCase();
    const list = projects.filter((p) => {
      const mine = !!user && p.owner === user._id;
      if (ownerFilter === 'mine' && !mine) return false;
      if (ownerFilter === 'shared' && mine) return false;
      if (q && !`${p.name} ${p.description ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      const key = sortBy === 'created' ? 'createdAt' : 'updatedAt';
      return new Date(b[key] ?? 0).getTime() - new Date(a[key] ?? 0).getTime();
    });
  }, [projects, search, sortBy, ownerFilter, user]);

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Delete project',
      message: 'Delete this project and all its files? This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    await projectApi.remove(id);
    refresh();
  }

  const byType = (type: ProjectType) => (visible ?? []).filter((p) => p.type === type);
  const filtersActive = search.trim() !== '' || ownerFilter !== 'all';

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title="Workspaces"
        subtitle="All your projects, grouped by workspace."
        action={
          <Button onClick={() => nav('/new')}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />

      {projects && projects.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-full rounded-lg border border-slate-300 bg-surface py-1.5 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value as typeof ownerFilter)}
            className="rounded-lg border border-slate-300 bg-surface px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500"
          >
            <option value="all">All projects</option>
            <option value="mine">Owned by me</option>
            <option value="shared">Shared with me</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="rounded-lg border border-slate-300 bg-surface px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500"
          >
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
      )}

      {projects === null ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="space-y-10">
          {WORKSPACE_LIST.map((w) => {
            const items = byType(w.type);
            const Icon = w.Icon;
            return (
              <section key={w.type}>
                <div className="mb-3 flex items-center justify-between">
                  <button
                    onClick={() => nav(`/workspace/${w.type}`)}
                    className="flex items-center gap-2 text-lg font-semibold text-slate-900 hover:text-brand-700"
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${w.iconBg}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {w.title}
                    <span className="text-sm font-normal text-slate-400">({items.length})</span>
                  </button>
                  <button
                    onClick={() => nav(`/workspace/${w.type}`)}
                    className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
                  >
                    Open workspace <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-surface px-5 py-8 text-center text-sm text-slate-500">
                    {filtersActive ? (
                      <>No matching {w.title.replace(' Workspace', '')} projects.</>
                    ) : (
                      <>
                        No {w.title.replace(' Workspace', '')} projects yet.{' '}
                        <button onClick={() => nav(`/workspace/${w.type}`)} className="font-medium text-brand-600 hover:underline">
                          Create one
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((p) => (
                      <div
                        key={p._id}
                        onClick={() => nav(`/project/${p._id}`)}
                        className="group cursor-pointer rounded-xl border border-slate-200 bg-surface p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <h3 className="flex items-center gap-2 truncate font-semibold text-slate-900">
                            {p.name}
                            {user && p.owner !== user._id && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                Shared
                              </span>
                            )}
                          </h3>
                          <button
                            onClick={(e) => remove(p._id, e)}
                            className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description || 'No description'}</p>
                        {user && p.owner !== user._id && (p.ownerName || p.ownerEmail) && (
                          <p className="mt-2 text-xs text-slate-400">
                            Shared by <span className="font-medium text-slate-500">{p.ownerName || p.ownerEmail}</span>
                          </p>
                        )}
                        <p className="mt-4 text-xs text-slate-400">
                          Updated {new Date(p.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
