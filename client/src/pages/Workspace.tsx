import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import TopBar from '../components/TopBar';
import { Button, Field, Modal, Spinner } from '../components/ui';
import { projectApi } from '../api';
import { WORKSPACES } from '../workspaceMeta';
import type { Project, ProjectType } from '../types';

export default function Workspace() {
  const { type } = useParams<{ type: ProjectType }>();
  const meta = type ? WORKSPACES[type] : undefined;
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    if (!type) return;
    setProjects(await projectApi.list(type));
  }

  useEffect(() => {
    refresh();
  }, [type]);

  if (!meta) return null;
  const Icon = meta.Icon;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!type) return;
    setBusy(true);
    setError('');
    try {
      const project = await projectApi.create({ name, description: desc, type });
      nav(`/project/${project._id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function remove(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this project and all its files?')) return;
    await projectApi.remove(id);
    refresh();
  }

  return (
    <div className="min-h-screen">
      <TopBar>
        <span className="text-slate-300">/</span>
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <Icon className={`h-4 w-4 ${meta.accent}`} /> {meta.title}
        </span>
      </TopBar>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{meta.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{meta.blurb}</p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        </div>

        <div className="mt-8">
          {projects === null ? (
            <div className="flex justify-center py-20">
              <Spinner className="h-8 w-8" />
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <p className="text-slate-500">No projects yet.</p>
              <Button className="mt-4" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Create your first {meta.title.replace(' Workspace', '')} project
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <div
                  key={p._id}
                  onClick={() => nav(`/project/${p._id}`)}
                  className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-slate-900">{p.name}</h3>
                    <button
                      onClick={(e) => remove(p._id, e)}
                      className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                    {p.description || 'No description'}
                  </p>
                  <p className="mt-4 text-xs text-slate-400">
                    Updated {new Date(p.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Modal open={creating} onClose={() => setCreating(false)} title={`New ${meta.title} project`}>
        <form onSubmit={create} className="space-y-4">
          <Field label="Project name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="My awesome app" autoFocus />
          <Field label="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What is this for?" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create & open'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
