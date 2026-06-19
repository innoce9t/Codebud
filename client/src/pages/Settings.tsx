import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Moon, Sun } from 'lucide-react';
import { PageHeader, Button } from '../components/ui';
import { aiApi } from '../api';
import { useAuth } from '../auth';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <div>{children}</div>
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [activeModelName, setActiveModelName] = useState<string | null>(null);

  useEffect(() => {
    aiApi
      .catalog()
      .then((c) => {
        const m = c.providers.flatMap((p) => p.models).find((m) => m.id === c.activeModel);
        setActiveModelName(m ? m.name : null);
      })
      .catch(() => setActiveModelName(null));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <PageHeader title="Settings" subtitle="Manage your account and preferences." />

      <div className="space-y-6">
        <Card title="Account">
          <Row label="Name">
            <span className="text-sm font-medium text-slate-800">{user?.name}</span>
          </Row>
          <Row label="Email">
            <span className="text-sm font-medium text-slate-800">{user?.email}</span>
          </Row>
        </Card>

        <Card title="Appearance">
          <Row label="Theme">
            <div className="flex rounded-lg bg-slate-100 p-1">
              <span className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-sm font-medium text-brand-700 shadow-sm">
                <Sun className="h-4 w-4" /> Light
              </span>
              <span className="flex cursor-not-allowed items-center gap-1.5 px-3 py-1 text-sm text-slate-400" title="Coming soon">
                <Moon className="h-4 w-4" /> Dark
              </span>
            </div>
          </Row>
        </Card>

        <Card title="AI">
          <Row label="Active model">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <Bot className="h-4 w-4 text-brand-600" />
                {activeModelName ?? 'Default assistant'}
              </span>
              <Button variant="subtle" className="!py-1 !px-2 text-xs" onClick={() => nav('/ai-models')}>
                Manage
              </Button>
            </div>
          </Row>
        </Card>

        <Card title="Session">
          <Row label="Sign out of CodeBud">
            <Button
              variant="danger"
              onClick={async () => {
                await logout();
                nav('/login');
              }}
            >
              Log out
            </Button>
          </Row>
        </Card>
      </div>
    </div>
  );
}
