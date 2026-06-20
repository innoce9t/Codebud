import Editor from '@monaco-editor/react';
import { languageFromPath } from '../fileTree';
import { useAuth } from '../auth';

interface Props {
  path: string;
  value: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ path, value, onChange }: Props) {
  const { user } = useAuth();
  const prefs = user?.preferences?.editor;

  return (
    <Editor
      height="100%"
      theme="light"
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
