import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Check, Moon, Sun, TriangleAlert } from 'lucide-react';
import { PageHeader, Button } from '../components/ui';
import { aiApi } from '../api';
import { useAuth } from '../auth';
import type { ProfilePatch, SubscriptionTier } from '../types';

const LANGUAGES = [
  ['en', 'English'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['de', 'Deutsch'],
  ['pt', 'Português'],
  ['hi', 'हिन्दी'],
  ['zh', '中文'],
  ['ja', '日本語'],
  ['ar', 'العربية'],
] as const;

const TIMEZONES: string[] = (() => {
  try {
    const sv = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    const zones: string[] = sv ? sv('timeZone') : [];
    return zones.length ? ['UTC', ...zones.filter((z) => z !== 'UTC')] : fallbackZones();
  } catch {
    return fallbackZones();
  }
})();
function fallbackZones() {
  return ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];
}

const TIERS: { id: SubscriptionTier; name: string; price: string; features: string[] }[] = [
  { id: 'free', name: 'Free', price: '$0', features: ['3 workspaces', 'Mock AI assistant', 'Community support'] },
  { id: 'pro', name: 'Pro', price: '$12/mo', features: ['Unlimited projects', 'Bring your own AI keys', 'Version history', 'Priority support'] },
  { id: 'team', name: 'Team', price: '$29/mo', features: ['Everything in Pro', 'Real-time collaboration', 'Shared workspaces', 'Admin controls'] },
];

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div>
        <span className="text-sm text-slate-700">{label}</span>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

const selectCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-brand-500';

export default function Settings() {
  const { user, updateProfile, logout, deleteAccount } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [status, setStatus] = useState('');
  const [activeModelName, setActiveModelName] = useState<string | null>(null);

  useEffect(() => setName(user?.name ?? ''), [user?.name]);
  useEffect(() => {
    aiApi
      .catalog()
      .then((c) => {
        const m = c.providers.flatMap((p) => p.models).find((m) => m.id === c.activeModel);
        setActiveModelName(m ? m.name : null);
      })
      .catch(() => setActiveModelName(null));
  }, []);

  async function save(patch: ProfilePatch) {
    setStatus('Saving…');
    try {
      await updateProfile(patch);
      setStatus('Saved');
      setTimeout(() => setStatus(''), 1500);
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  const prefs = user?.preferences;
  const editor = prefs?.editor ?? { fontSize: 13, tabSize: 2, wordWrap: false, minimap: false };
  const notif = prefs?.notifications ?? { productUpdates: true, projectActivity: true };
  const tier = user?.subscriptionTier ?? 'free';

  async function removeAccount() {
    if (!confirm('Delete your account and ALL projects, files and chats? This cannot be undone.')) return;
    await deleteAccount();
    nav('/login');
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <PageHeader
        title="Settings"
        subtitle="Manage your account, preferences and plan."
        action={status ? <span className="text-sm text-slate-400">{status}</span> : undefined}
      />

      <div className="space-y-6">
        <Card title="Account">
          <Row label="Name">
            <div className="flex items-center gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className={selectCls} />
              <Button
                variant="subtle"
                className="!py-1.5 text-xs"
                disabled={!name.trim() || name === user?.name}
                onClick={() => save({ name: name.trim() })}
              >
                Save
              </Button>
            </div>
          </Row>
          <Row label="Email">
            <span className="text-sm font-medium text-slate-800">{user?.email}</span>
          </Row>
        </Card>

        <Card title="Preferences">
          <Row label="Language" hint="Interface language">
            <select
              className={selectCls}
              value={prefs?.language ?? 'en'}
              onChange={(e) => save({ preferences: { language: e.target.value } })}
            >
              {LANGUAGES.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Time zone" hint="Used for dates and timestamps">
            <select
              className={`${selectCls} max-w-[220px]`}
              value={prefs?.timezone ?? 'UTC'}
              onChange={(e) => save({ preferences: { timezone: e.target.value } })}
            >
              {TIMEZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </Row>
        </Card>

        <Card title="Editor" description="These apply to the code editor in your projects.">
          <Row label="Font size">
            <select className={selectCls} value={editor.fontSize} onChange={(e) => save({ preferences: { editor: { fontSize: Number(e.target.value) } } })}>
              {[11, 12, 13, 14, 16, 18, 20].map((n) => (
                <option key={n} value={n}>
                  {n}px
                </option>
              ))}
            </select>
          </Row>
          <Row label="Tab size">
            <select className={selectCls} value={editor.tabSize} onChange={(e) => save({ preferences: { editor: { tabSize: Number(e.target.value) } } })}>
              {[2, 4, 8].map((n) => (
                <option key={n} value={n}>
                  {n} spaces
                </option>
              ))}
            </select>
          </Row>
          <Row label="Word wrap">
            <Toggle checked={editor.wordWrap} onChange={(v) => save({ preferences: { editor: { wordWrap: v } } })} />
          </Row>
          <Row label="Minimap">
            <Toggle checked={editor.minimap} onChange={(v) => save({ preferences: { editor: { minimap: v } } })} />
          </Row>
        </Card>

        <Card title="Notifications">
          <Row label="Product updates" hint="News about new CodeBud features">
            <Toggle checked={notif.productUpdates} onChange={(v) => save({ preferences: { notifications: { productUpdates: v } } })} />
          </Row>
          <Row label="Project activity" hint="Alerts about changes in your projects">
            <Toggle checked={notif.projectActivity} onChange={(v) => save({ preferences: { notifications: { projectActivity: v } } })} />
          </Row>
        </Card>

        <Card title="Plan" description="Your current subscription tier.">
          <div className="grid gap-3 sm:grid-cols-3">
            {TIERS.map((t) => {
              const current = t.id === tier;
              return (
                <div
                  key={t.id}
                  className={`rounded-xl border p-4 ${current ? 'border-brand-400 bg-brand-50/40 ring-1 ring-brand-400/30' : 'border-slate-200'}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">{t.name}</h3>
                    {current && (
                      <span className="flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-medium text-white">
                        <Check className="h-3 w-3" /> Current
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-900">{t.price}</p>
                  <ul className="mt-2 space-y-1">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-xs text-slate-500">
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" /> {f}
                      </li>
                    ))}
                  </ul>
                  {!current && (
                    <Button variant="subtle" className="mt-3 w-full !py-1.5 text-xs" onClick={() => save({ subscriptionTier: t.id })}>
                      {t.id === 'free' ? 'Downgrade' : 'Upgrade'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
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

        <Card title="Session">
          <Row label="Sign out of CodeBud">
            <Button
              variant="subtle"
              onClick={async () => {
                await logout();
                nav('/login');
              }}
            >
              Log out
            </Button>
          </Row>
        </Card>

        <section className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
          <h2 className="flex items-center gap-2 font-semibold text-red-700">
            <TriangleAlert className="h-4 w-4" /> Danger zone
          </h2>
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              Permanently delete your account and all projects, files and chat history.
            </p>
            <Button variant="danger" onClick={removeAccount}>
              Delete account
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
