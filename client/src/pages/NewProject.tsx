import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { WORKSPACE_LIST } from '../workspaceMeta';

export default function NewProject() {
  const nav = useNavigate();
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <PageHeader title="New project" subtitle="Choose a workspace type to get started." />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {WORKSPACE_LIST.map((w) => {
          const Icon = w.Icon;
          return (
            <button
              key={w.type}
              onClick={() => nav(`/workspace/${w.type}`)}
              className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-surface bg-gradient-to-br ${w.gradient} p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-md`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${w.iconBg}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">{w.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{w.blurb}</p>
              <div className="mt-6 flex items-center gap-1 text-sm font-medium text-brand-600 transition group-hover:translate-x-1">
                Create <ArrowRight className="h-4 w-4" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
