import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import TopBar from '../components/TopBar';
import { WORKSPACE_LIST } from '../workspaceMeta';
import { projectApi } from '../api';
import type { Project } from '../types';
import { useAuth } from '../auth';

export default function Dashboard() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    projectApi.list().then((projects: Project[]) => {
      const c: Record<string, number> = {};
      for (const p of projects) c[p.type] = (c[p.type] ?? 0) + 1;
      setCounts(c);
    });
  }, []);

  return (
    <div className="min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="mt-2 text-slate-500">Pick a workspace to start building.</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {WORKSPACE_LIST.map((w) => {
            const Icon = w.Icon;
            return (
              <button
                key={w.type}
                onClick={() => nav(`/workspace/${w.type}`)}
                className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${w.gradient} p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-md`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${w.iconBg}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-900">{w.title}</h2>
                <p className="mt-2 text-sm text-slate-500">{w.blurb}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className={`text-sm font-medium ${w.accent}`}>
                    {counts[w.type] ?? 0} project{(counts[w.type] ?? 0) === 1 ? '' : 's'}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-600">
                    Open <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
