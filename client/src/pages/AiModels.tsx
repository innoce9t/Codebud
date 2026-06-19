import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Circle, Cpu, Sparkles } from 'lucide-react';
import { PageHeader, Spinner } from '../components/ui';
import { systemApi, type HealthInfo } from '../api';

interface ModelInfo {
  id: 'anthropic' | 'openai' | 'mock';
  name: string;
  vendor: string;
  Icon: typeof Bot;
  models: string[];
  note: string;
}

const MODELS: ModelInfo[] = [
  {
    id: 'anthropic',
    name: 'Claude',
    vendor: 'Anthropic',
    Icon: Sparkles,
    models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    note: 'Set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY to enable.',
  },
  {
    id: 'openai',
    name: 'GPT',
    vendor: 'OpenAI',
    Icon: Cpu,
    models: ['gpt-4o', 'gpt-4o-mini'],
    note: 'Set AI_PROVIDER=openai and OPENAI_API_KEY to enable.',
  },
  {
    id: 'mock',
    name: 'Mock Assistant',
    vendor: 'Built-in',
    Icon: Bot,
    models: ['deterministic / no key'],
    note: 'Keyless fallback so the app works out of the box.',
  },
];

export default function AiModels() {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    systemApi
      .health()
      .then(setHealth)
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <PageHeader title="AI Models" subtitle="Connected AI providers used by the chat assistant." />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : (
        <div className="space-y-4">
          {MODELS.map((m) => {
            const connected = health?.aiProvider === m.id;
            const Icon = m.Icon;
            return (
              <div
                key={m.id}
                className={`flex items-start gap-4 rounded-2xl border p-5 shadow-sm ${
                  connected ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    connected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {m.name} <span className="font-normal text-slate-400">· {m.vendor}</span>
                    </h3>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {m.models.map((model) => (
                      <span key={model} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                        {model}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{m.note}</p>
                </div>
                <div className="shrink-0">
                  {connected ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-400">
                      <Circle className="h-3.5 w-3.5" /> Inactive
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Provider is configured via environment variables on the server and applies to all projects.
      </p>
    </div>
  );
}
