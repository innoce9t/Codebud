import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Gem,
  KeyRound,
  Lock,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { PageHeader, Button, Spinner } from '../components/ui';
import { useConfirm } from '../components/ConfirmProvider';
import { aiApi } from '../api';
import type { AiCatalog, AiProvider, CatalogProvider } from '../types';

const PROVIDER_ICON: Record<AiProvider, typeof Sparkles> = {
  anthropic: Sparkles,
  openai: Cpu,
  google: Gem,
};
const PROVIDER_STYLE: Record<AiProvider, string> = {
  anthropic: 'bg-orange-100 text-orange-600',
  openai: 'bg-emerald-100 text-emerald-600',
  google: 'bg-blue-100 text-blue-600',
};

export default function AiModels() {
  const confirm = useConfirm();
  const [catalog, setCatalog] = useState<AiCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>(''); // provider/model id currently mutating
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function refresh() {
    setCatalog(await aiApi.catalog());
  }
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const total = catalog?.providers.reduce((n, p) => n + p.models.length, 0) ?? 0;

  async function connect(p: CatalogProvider) {
    const apiKey = (drafts[p.id] || '').trim();
    if (!apiKey) return;
    setBusy(p.id);
    setError('');
    try {
      await aiApi.connect(p.id, apiKey);
      setDrafts((d) => ({ ...d, [p.id]: '' }));
      await refresh();
    } catch (err) {
      setError(`${p.name}: ${(err as Error).message}`);
    } finally {
      setBusy('');
    }
  }

  async function disconnect(p: CatalogProvider) {
    const ok = await confirm({
      title: `Disconnect ${p.name}`,
      message: `Disconnect ${p.name}? Its models will become unavailable until you reconnect.`,
      confirmLabel: 'Disconnect',
      danger: true,
    });
    if (!ok) return;
    setBusy(p.id);
    try {
      await aiApi.disconnect(p.id);
      await refresh();
    } finally {
      setBusy('');
    }
  }

  async function setActive(modelId: string) {
    setBusy(modelId);
    setError('');
    try {
      await aiApi.setActive(modelId);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <PageHeader
        title={`Models (${total})`}
        subtitle="Connect a provider with your API key to enable its models for the AI assistant."
      />

      {error && (
        <p className="mb-5 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading || !catalog ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="space-y-10">
          {catalog.providers.map((p) => {
            const Icon = PROVIDER_ICON[p.id];
            return (
              <section key={p.id}>
                {/* Provider header + connection control */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${PROVIDER_STYLE[p.id]}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="font-semibold text-slate-900">
                        {p.vendor} <span className="font-normal text-slate-400">· {p.name}</span>
                      </h2>
                      <a
                        href={p.getKeyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                      >
                        Get API key from {p.getKeyLabel} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {p.connected ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Connected ····{p.last4}
                      </span>
                      <Button variant="ghost" className="!py-1 !px-2 text-xs" onClick={() => disconnect(p)} disabled={busy === p.id}>
                        <Trash2 className="h-3.5 w-3.5" /> Disconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          value={drafts[p.id] ?? ''}
                          onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && connect(p)}
                          placeholder={`Paste ${p.name} API key`}
                          className="w-64 rounded-lg border border-slate-300 bg-surface py-2 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                      <Button onClick={() => connect(p)} disabled={busy === p.id || !(drafts[p.id] || '').trim()}>
                        {busy === p.id ? 'Connecting…' : 'Connect'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Model cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {p.models.map((m) => {
                    const active = catalog.activeModel === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col rounded-xl border p-5 shadow-sm transition ${
                          active
                            ? 'border-brand-400 bg-brand-500/10 ring-1 ring-brand-400/30'
                            : 'border-slate-200 bg-surface'
                        } ${!p.connected ? 'opacity-60' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${PROVIDER_STYLE[p.id]}`}>
                            <Icon className="h-5 w-5" />
                          </span>
                          {active && (
                            <span className="flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-medium text-white">
                              <Check className="h-3 w-3" /> Active
                            </span>
                          )}
                        </div>
                        <h3 className="mt-3 font-semibold text-slate-900">{m.name}</h3>
                        <p className="mt-1 flex-1 text-sm text-slate-500">{m.description}</p>

                        <div className="mt-4">
                          {!p.connected ? (
                            <span className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Lock className="h-3.5 w-3.5" /> Connect {p.name} to use
                            </span>
                          ) : active ? (
                            <span className="text-xs font-medium text-brand-600">In use by the assistant</span>
                          ) : (
                            <Button
                              variant="subtle"
                              className="!py-1.5 text-xs"
                              onClick={() => setActive(m.id)}
                              disabled={busy === m.id}
                            >
                              {busy === m.id ? 'Setting…' : 'Use this model'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-slate-400">
        API keys are encrypted at rest and used only to call the provider on your behalf. If no model
        is active, the assistant falls back to the server's default (mock) provider.
      </p>
    </div>
  );
}
