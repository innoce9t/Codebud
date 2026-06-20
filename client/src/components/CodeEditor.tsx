import Editor from '@monaco-editor/react';
import { languageFromPath } from '../fileTree';
import { useAuth } from '../auth';
import { useTheme } from '../theme';

interface Props {
  path: string;
  value: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ path, value, onChange }: Props) {
  const { user } = useAuth();
  const { resolvedMode } = useTheme();
  const prefs = user?.preferences?.editor;

  return (
    <Editor
      height="100%"
      theme={resolvedMode === 'dark' ? 'vs-dark' : 'light'}
      path={path}
      language={languageFromPath(path)}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      options={{
        fontSize: prefs?.fontSize ?? 13,
        tabSize: prefs?.tabSize ?? 2,
        wordWrap: prefs?.wordWrap ? 'on' : 'off',
        minimap: { enabled: prefs?.minimap ?? false },
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 12 },
        smoothScrolling: true,
        renderWhitespace: 'selection',
      }}
    />
  );
}
