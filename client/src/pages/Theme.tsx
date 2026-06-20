import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { ACCENTS, useTheme, type ThemeMode } from '../theme';

const MODES: { id: ThemeMode; name: string; desc: string; Icon: typeof Sun }[] = [
  { id: 'light', name: 'Light', desc: 'Always use the light theme.', Icon: Sun },
  { id: 'dark', name: 'Dark', desc: 'Always use the dark theme.', Icon: Moon },
  { id: 'system', name: 'System', desc: 'Match your device setting.', Icon: Monitor },
];

export default function Theme() {
  const { mode, accent, resolvedMode, setMode, setAccent } = useTheme();

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <PageHeader title="Theme" subtitle="Personalize how CodeBud looks." />

      <div className="space-y-6">
        {/* Appearance mode */}
        <section className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Appearance</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Currently showing the <span className="font-medium text-slate-700">{resolvedMode}</span> theme.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {MODES.map((m) => {
              const Icon = m.Icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition ${
                    active
                      ? 'border-brand-400 bg-brand-500/10 ring-1 ring-brand-400/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <Icon className="h-5 w-5 text-slate-600" />
                    {active && <Check className="h-4 w-4 text-brand-600" />}
                  </div>
                  <span className="mt-3 font-medium text-slate-900">{m.name}</span>
                  <span className="text-xs text-slate-500">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Accent color */}
        <section className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Accent color</h2>
          <p className="mt-0.5 text-sm text-slate-500">Used for buttons, links and highlights.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ACCENTS.map((a) => {
              const active = accent === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setAccent(a.id)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    active ? 'border-slate-400 ring-1 ring-slate-400/30' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ background: a.swatch }}
                  >
                    {active && <Check className="h-4 w-4 text-white" />}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{a.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Preview */}
        <section className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Preview</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Primary button
            </button>
            <button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
              Secondary
            </button>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">Badge</span>
            <a className="text-sm font-medium text-brand-600 hover:underline" href="#">
              A link
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
