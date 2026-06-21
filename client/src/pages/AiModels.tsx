import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Cpu, Gem, Lock, Search, Server, Settings2, Sparkles } from 'lucide-react';
import { PageHeader, Button, Spinner } from '../components/ui';
import { aiApi } from '../api';
import type { AiCatalog } from '../types';

const PROVIDER_ICON: Record<string, typeof Sparkles> = {
  anthropic: Sparkles,
  openai: Cpu,
  google: Gem,
  custom: Server,
};
const PROVIDER_STYLE: Record<string, string> = {
  anthropic: 'bg-orange-100 text-orange-600',
  openai: 'bg-emerald-100 text-emerald-600',
  google: 'bg-blue-100 text-blue-600',
  custom: 'bg-slate-200 text-slate-600',
};

interface ModelRow {
  id: string;
  name: string;
  description: string;
  providerId: string;
  providerName: string;
  connected: boolean;
}

export default function AiModels() {
  const nav = useNavigate();
  const [catalog, setCatalog] = useState<AiCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [connectedOnly, setConnectedOnly] = useState(false);

  async function refresh() {
    setCatalog(await aiApi.catalog());
  }
  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  // Flatten the catalog (plus the configured custom endpoint) into a single list.
  const rows = useMemo<ModelRow[]>(() => {
    if (!catalog) return [];
    const list: ModelRow[] = catalog.providers.flatMap((p) =>
      p.models.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        providerId: p.id,
        providerName: p.name,
        connected: p.connected,
      })),
    );
    const c = catalog.custom;
    if (c?.baseUrl && c?.model) {
      list.push({
        id: 'custom',
        name: c.model,
        description: `Custom OpenAI-compatible endpoint · ${c.baseUrl}`,
        providerId: 'custom',
        providerName: 'Custom',
        connected: true,
      });
    }
    return list;
  }, [catalog]);

  const providerOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((r) => seen.set(r.providerId, r.providerName));
    return [...seen.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (providerFilter !== 'all' && r.providerId !== providerFilter) return false;
      if (connectedOnly && !r.connected) return false;
      if (q && !`${r.name} ${r.description} ${r.providerName}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, providerFilter, connectedOnly]);

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

  const total = rows.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader
        title={`Models (${total})`}
        subtitle="Pick the model the assistant uses. Connect providers under Settings → AI Settings."
        action={
          <Button variant="subtle" onClick={() => nav('/settings#ai')}>
            <Settings2 className="h-4 w-4" /> Manage API keys
          </Button>
        }
      />

      {error && <p className="mb-5 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      {/* Toolbar: search + filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models…"
            className="w-full rounded-lg border border-slate-300 bg-surface py-2 pl-8 pr-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-500"
        >
          <option value="all">All providers</option>
          {providerOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={connectedOnly}
            onChange={(e) => setConnectedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Connected only
        </label>
      </div>

      {loading || !catalog ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No models match your filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const Icon = PROVIDER_ICON[m.providerId] ?? Sparkles;
            const active = catalog.activeModel === m.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col rounded-xl border p-5 shadow-sm transition ${
                  active
                    ? 'border-brand-400 bg-brand-500/10 ring-1 ring-brand-400/30'
                    : 'border-slate-200 bg-surface'
                } ${!m.connected ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${PROVIDER_STYLE[m.providerId] ?? 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {active ? (
                    <span className="flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-medium text-white">
                      <Check className="h-3 w-3" /> Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      {m.providerName}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{m.name}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-500">{m.description}</p>

                <div className="mt-4">
                  {!m.connected ? (
                    <button
                      onClick={() => nav('/settings#ai')}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-600"
                    >
                      <Lock className="h-3.5 w-3.5" /> Connect {m.providerName} to use
                    </button>
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
      )}

      <p className="mt-8 text-xs text-slate-400">
        API keys are encrypted at rest and used only to call the provider on your behalf. If no model
        is active, the assistant falls back to the server's default (mock) provider.
      </p>
    </div>
  );
}
