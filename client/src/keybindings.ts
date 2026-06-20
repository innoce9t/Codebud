export type KeyActionId = 'run' | 'save' | 'toggleOutput' | 'focusChat' | 'nextFile' | 'prevFile';

export interface KeyAction {
  id: KeyActionId;
  label: string;
}

export const KEY_ACTIONS: KeyAction[] = [
  { id: 'run', label: 'Run project' },
  { id: 'save', label: 'Save file' },
  { id: 'toggleOutput', label: 'Toggle console / preview' },
  { id: 'focusChat', label: 'Focus AI chat' },
  { id: 'nextFile', label: 'Next file' },
  { id: 'prevFile', label: 'Previous file' },
];

export const DEFAULT_KEYBINDINGS: Record<KeyActionId, string> = {
  run: 'mod+enter',
  save: 'mod+s',
  toggleOutput: 'mod+b',
  focusChat: 'mod+i',
  nextFile: 'alt+arrowdown',
  prevFile: 'alt+arrowup',
};

const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift']);

/** Normalize a keyboard event into a binding string like "mod+shift+k". */
export function eventToCombo(e: KeyboardEvent | React.KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null; // wait for a non-modifier key
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('mod');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();
  parts.push(key);
  return parts.join('+');
}

const KEY_LABELS: Record<string, string> = {
  mod: 'Ctrl/⌘',
  alt: 'Alt',
  shift: 'Shift',
  enter: 'Enter',
  escape: 'Esc',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  ' ': 'Space',
};

/** Pretty display for a binding string. */
export function formatCombo(combo: string): string {
  return combo
    .split('+')
    .map((p) => KEY_LABELS[p] ?? (p.length === 1 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' + ');
}

/** Merge stored bindings over defaults (handles partial / missing). */
export function resolveBindings(stored?: Partial<Record<KeyActionId, string>>): Record<KeyActionId, string> {
  return { ...DEFAULT_KEYBINDINGS, ...(stored ?? {}) };
}
