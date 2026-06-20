import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, LogOut, Mail, User as UserIcon } from 'lucide-react';
import { PageHeader, Button, Spinner } from '../components/ui';
import { projectApi } from '../api';
import { useAuth } from '../auth';
import type { Project } from '../types';

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    projectApi.list().then(setProjects);
  }, []);

  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <PageHeader title="Profile" subtitle="Your account details." />

      <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
            {initial}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
              <UserIcon className="h-3.5 w-3.5" /> Name
            </dt>
            <dd className="mt-1 truncate text-sm font-medium text-slate-800">{user?.name}</dd>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
              <Mail className="h-3.5 w-3.5" /> Email
            </dt>
            <dd className="mt-1 truncate text-sm font-medium text-slate-800">{user?.email}</dd>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" /> Member since
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">{memberSince}</dd>
          </div>
        </dl>

        <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-600">
            {projects === null ? (
              <Spinner />
            ) : (
              <>
                You have <span className="font-semibold text-slate-900">{projects.length}</span> project
                {projects.length === 1 ? '' : 's'}.
              </>
            )}
          </span>
          <Button
            variant="subtle"
            onClick={async () => {
              await logout();
              nav('/login');
            }}
          >
            <LogOut className="h-4 w-4" /> Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
