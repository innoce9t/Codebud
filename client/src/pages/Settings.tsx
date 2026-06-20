import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Check, CreditCard, Download, TriangleAlert } from 'lucide-react';
import { PageHeader, Button } from '../components/ui';
import { aiApi, authApi } from '../api';
import { useAuth } from '../auth';
import type { ProfilePatch, SubscriptionTier } from '../types';

function cardBrand(num: string): string {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6/.test(n)) return 'Discover';
  return 'Card';
}

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
    <section className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
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
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

const selectCls =
  'rounded-lg border border-slate-300 bg-surface px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-brand-500';

export default function Settings() {
  const { user, updateProfile, logout, deleteAccount } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [status, setStatus] = useState('');
  const [activeModelName, setActiveModelName] = useState<string | null>(null);

  // Change password
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  // Dummy billing
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');

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

  async function changePassword() {
    setPwMsg('');
    if (newPw.length < 6) return setPwMsg('New password must be at least 6 characters.');
    if (newPw !== confirmPw) return setPwMsg('New passwords do not match.');
    setPwBusy(true);
    try {
      await authApi.changePassword(curPw, newPw);
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
      setPwMsg('Password updated.');
    } catch (err) {
      setPwMsg((err as Error).message);
    } finally {
      setPwBusy(false);
    }
  }

  async function exportData() {
    setStatus('Preparing export…');
    try {
      const data = await authApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `codebud-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Exported');
      setTimeout(() => setStatus(''), 1500);
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  function saveCard() {
    const digits = cardNum.replace(/\D/g, '');
    if (digits.length < 13) return;
    save({ billing: { cardBrand: cardBrand(cardNum), cardLast4: digits.slice(-4) } });
    setCardNum('');
    setCardExp('');
    setCardCvc('');
  }

  const billing = user?.billing;
  const hasCard = !!billing?.cardLast4;
  const tierPrice = TIERS.find((t) => t.id === tier)?.price ?? '$0';

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

        <Card title="Security" description="Change your password.">
          <div className="grid max-w-md gap-3">
            <input
              type="password"
              placeholder="Current password"
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              className={`${selectCls} w-full`}
            />
            <input
              type="password"
              placeholder="New password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className={`${selectCls} w-full`}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className={`${selectCls} w-full`}
            />
            {pwMsg && (
              <p className={`text-sm ${pwMsg === 'Password updated.' ? 'text-emerald-600' : 'text-red-600'}`}>
                {pwMsg}
              </p>
            )}
            <div>
              <Button onClick={changePassword} disabled={pwBusy || !curPw || !newPw}>
                {pwBusy ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </div>
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

        <Card title="Billing" description="Demo billing — no real charges are made.">
          <Row label="Current plan">
            <span className="text-sm font-medium text-slate-800 capitalize">
              {tier} · {tierPrice}
            </span>
          </Row>
          <Row label="Payment method">
            {hasCard ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  {billing!.cardBrand} ···· {billing!.cardLast4}
                </span>
                <Button
                  variant="ghost"
                  className="!py-1 !px-2 text-xs"
                  onClick={() => save({ billing: { cardBrand: '', cardLast4: '' } })}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <span className="text-sm text-slate-400">No card on file</span>
            )}
          </Row>

          {!hasCard && (
            <div className="mt-3 grid max-w-md gap-2 sm:grid-cols-2">
              <input
                placeholder="Card number"
                value={cardNum}
                onChange={(e) => setCardNum(e.target.value)}
                className={`${selectCls} w-full sm:col-span-2`}
                inputMode="numeric"
              />
              <input placeholder="MM / YY" value={cardExp} onChange={(e) => setCardExp(e.target.value)} className={`${selectCls} w-full`} />
              <input placeholder="CVC" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} className={`${selectCls} w-full`} inputMode="numeric" />
              <div className="sm:col-span-2">
                <Button onClick={saveCard} disabled={cardNum.replace(/\D/g, '').length < 13}>
                  Save card
                </Button>
                <span className="ml-2 text-xs text-slate-400">Use any number, e.g. 4242 4242 4242 4242</span>
              </div>
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-slate-600">Invoices</p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr>
                  <th className="py-1 font-medium">Date</th>
                  <th className="font-medium">Amount</th>
                  <th className="font-medium">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {['2026-06-01', '2026-05-01', '2026-04-01'].map((d) => (
                  <tr key={d}>
                    <td className="py-2 text-slate-700">{d}</td>
                    <td className="text-slate-700">{tierPrice}</td>
                    <td>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Paid</span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => alert('Demo invoice — no PDF in this build.')}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <Row label="Theme & accent color" hint="Light / dark / system and accent colors">
            <Button variant="subtle" className="!py-1 !px-2 text-xs" onClick={() => nav('/theme')}>
              Open Theme
            </Button>
          </Row>
        </Card>

        <Card title="Data" description="Download a copy of all your projects, files and chat history.">
          <Row label="Export account data" hint="Generates a JSON file you can download">
            <Button variant="subtle" onClick={exportData}>
              <Download className="h-4 w-4" /> Export
            </Button>
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
