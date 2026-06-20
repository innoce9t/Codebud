import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './auth';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AccentTheme {
  id: string;
  name: string;
  swatch: string; // representative color for the picker (the 600 shade)
  vars: Record<string, string>; // --brand-* RGB triplets
}

// Each accent supplies the brand-50/100/400/500/600/700 ramp as "R G B".
export const ACCENTS: AccentTheme[] = [
  mk('indigo', 'Indigo', '79 70 229', ['238 242 255', '224 231 255', '129 140 248', '99 102 241', '79 70 229', '67 56 202']),
  mk('violet', 'Violet', '124 58 237', ['245 243 255', '237 233 254', '167 139 250', '139 92 246', '124 58 237', '109 40 217']),
  mk('blue', 'Blue', '37 99 235', ['239 246 255', '219 234 254', '96 165 250', '59 130 246', '37 99 235', '29 78 216']),
  mk('sky', 'Sky', '2 132 199', ['240 249 255', '224 242 254', '56 189 248', '14 165 233', '2 132 199', '3 105 161']),
  mk('emerald', 'Emerald', '5 150 105', ['236 253 245', '209 250 229', '52 211 153', '16 185 129', '5 150 105', '4 120 87']),
  mk('amber', 'Amber', '217 119 6', ['255 251 235', '254 243 199', '251 191 36', '245 158 11', '217 119 6', '180 83 9']),
  mk('rose', 'Rose', '225 29 72', ['255 241 242', '255 228 230', '251 113 133', '244 63 94', '225 29 72', '190 18 60']),
  mk('slate', 'Graphite', '71 85 105', ['248 250 252', '241 245 249', '148 163 184', '100 116 139', '71 85 105', '51 65 85']),
];

function mk(id: string, name: string, swatch: string, ramp: string[]): AccentTheme {
  const keys = [50, 100, 400, 500, 600, 700];
  return {
    id,
    name,
    swatch: `rgb(${swatch})`,
    vars: Object.fromEntries(keys.map((k, i) => [`--brand-${k}`, ramp[i]])),
  };
}

interface ThemeCtx {
  mode: ThemeMode;
  accent: string;
  resolvedMode: 'light' | 'dark';
  setMode: (m: ThemeMode) => void;
  setAccent: (a: string) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const LS_MODE = 'cb-theme-mode';
const LS_ACCENT = 'cb-theme-accent';

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyAccent(accentId: string) {
  const accent = ACCENTS.find((a) => a.id === accentId) ?? ACCENTS[0];
  for (const [k, v] of Object.entries(accent.vars)) {
    document.documentElement.style.setProperty(k, v);
  }
}

function applyMode(mode: ThemeMode): 'light' | 'dark' {
  const resolved = mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, updateProfile } = useAuth();
  // Initialize from localStorage to avoid a flash before the user loads.
  const [mode, setModeState] = useState<ThemeMode>(
    () => (localStorage.getItem(LS_MODE) as ThemeMode) || 'system',
  );
  const [accent, setAccentState] = useState<string>(() => localStorage.getItem(LS_ACCENT) || 'indigo');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>(() => applyMode(mode));

  // Apply on change.
  useEffect(() => {
    setResolvedMode(applyMode(mode));
    localStorage.setItem(LS_MODE, mode);
  }, [mode]);
  useEffect(() => {
    applyAccent(accent);
    localStorage.setItem(LS_ACCENT, accent);
  }, [accent]);

  // Follow system changes while in "system" mode.
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedMode(applyMode('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  // Sync from the logged-in user's saved preferences.
  useEffect(() => {
    const t = user?.preferences?.theme;
    if (!t) return;
    if (t.mode) setModeState(t.mode);
    if (t.accent) setAccentState(t.accent);
  }, [user?.preferences?.theme?.mode, user?.preferences?.theme?.accent]);

  const persist = (patch: { mode?: ThemeMode; accent?: string }) => {
    if (user) updateProfile({ preferences: { theme: patch } }).catch(() => {});
  };

  const value: ThemeCtx = {
    mode,
    accent,
    resolvedMode,
    setMode: (m) => {
      setModeState(m);
      persist({ mode: m });
    },
    setAccent: (a) => {
      setAccentState(a);
      persist({ accent: a });
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
