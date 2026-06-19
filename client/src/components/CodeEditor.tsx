import Editor from '@monaco-editor/react';
import { languageFromPath } from '../fileTree';

interface Props {
  path: string;
  value: string;
  onChange: (value: string) => void;
}

export default function CodeEditor({ path, value, onChange }: Props) {
  return (
    <Editor
      height="100%"
      theme="light"
      path={path}
      language={languageFromPath(path)}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      options={{
        fontSize: 13,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 12 },
        smoothScrolling: true,
        renderWhitespace: 'selection',
      }}
    />
  );
}
