import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Button, Field, Modal, PageHeader, Spinner } from '../components/ui';
import { projectApi, templateApi } from '../api';
import { WORKSPACES } from '../workspaceMeta';
import type { Project, ProjectType, TemplateMeta } from '../types';

export default function Workspace() {
  const { type } = useParams<{ type: ProjectType }>();
  const meta = type ? WORKSPACES[type] : undefined;
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<TemplateMeta | null>(null); // template the new project starts from
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

  useEffect(() => {
    if (!type) return;
    templateApi.list().then((all) => setTemplates(all[type] ?? []));
  }, [type]);

  if (!meta) return null;
  const Icon = meta.Icon;

  // Open the name modal, starting from a given template (defaults to the first / "starter").
  function openCreate(template?: TemplateMeta) {
    setPending(template ?? templates[0] ?? null);
    setName('');
    setDesc('');
    setError('');
    setCreating(true);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!type) return;
    setBusy(true);
    setError('');
    try {
      const project = await projectApi.create({
        name,
        description: desc,
        type,
        template: pending?.id,
      });
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
    <div className="mx-auto max-w-5xl px-8 py-10">
      <button
        onClick={() => nav('/new')}
        className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> All workspace types
      </button>

      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${meta.accent}`} /> {meta.title}
          </span>
        }
        subtitle={meta.blurb}
        action={
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" /> New project
          </Button>
        }
      />

      {/* Quick start templates */}
      <section className="mb-10">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Quick start</h2>
        </div>
        {templates.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => openCreate(t)}
                className={`group flex h-full flex-col rounded-xl border border-slate-200 bg-gradient-to-br ${meta.gradient} p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-semibold text-slate-900">{t.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{t.description}</p>
                <span className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-600 opacity-0 transition group-hover:opacity-100">
                  <Plus className="h-3.5 w-3.5" /> Use this template
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Existing projects */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Your projects</h2>
        {projects === null ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
            <p className="text-slate-500">No projects yet — pick a quick-start template above to begin.</p>
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
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description || 'No description'}</p>
                <p className="mt-4 text-xs text-slate-400">
                  Updated {new Date(p.updatedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal open={creating} onClose={() => setCreating(false)} title={`New ${meta.title.replace(' Workspace', '')} project`}>
        <form onSubmit={create} className="space-y-4">
          {pending && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
              Starting from the <span className="font-semibold">{pending.name}</span> template.
            </p>
          )}
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
