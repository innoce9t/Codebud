import { useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { languageFromPath } from '../fileTree';
import { useAuth } from '../auth';
import { useTheme } from '../theme';
import { completionApi } from '../api';

interface Props {
  projectId: string;
  path: string;
  value: string;
  onChange: (value: string) => void;
}

// Languages we offer inline AI completions for.
const COMPLETION_LANGS = ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'markdown'];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function CodeEditor({ projectId, path, value, onChange }: Props) {
  const { user } = useAuth();
  const { resolvedMode } = useTheme();
  const prefs = user?.preferences?.editor;

  // Keep the latest context available to the (once-registered) provider.
  const ctx = useRef({ projectId, enabled: prefs?.aiCompletions !== false });
  ctx.current = { projectId, enabled: prefs?.aiCompletions !== false };

  const handleMount: OnMount = (_editor, monaco) => {
    // Register a single inline-completions provider for the supported languages.
    monaco.languages.registerInlineCompletionsProvider(COMPLETION_LANGS, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provideInlineCompletions: async (model: any, position: any, _c: any, token: any) => {
        if (!ctx.current.enabled) return { items: [] };

        const prefix = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        if (prefix.trim().length < 2) return { items: [] };
        const lastLine = model.getLineCount();
        const suffix = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: lastLine,
          endColumn: model.getLineMaxColumn(lastLine),
        });

        // Debounce: wait for a pause; Monaco cancels the token on new keystrokes.
        await delay(350);
        if (token.isCancellationRequested) return { items: [] };

        const controller = new AbortController();
        token.onCancellationRequested?.(() => controller.abort());
        let completion = '';
        try {
          completion = await completionApi.complete(
            ctx.current.projectId,
            { language: model.getLanguageId(), prefix: prefix.slice(-4000), suffix: suffix.slice(0, 1500) },
            controller.signal,
          );
        } catch {
          return { items: [] };
        }
        if (!completion || token.isCancellationRequested) return { items: [] };

        return {
          items: [
            {
              insertText: completion,
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column,
              ),
            },
          ],
        };
      },
      freeInlineCompletions: () => {},
    });
  };

  return (
    <Editor
      height="100%"
      theme={resolvedMode === 'dark' ? 'vs-dark' : 'light'}
      path={path}
      language={languageFromPath(path)}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={handleMount}
      options={{
        fontSize: prefs?.fontSize ?? 13,
        tabSize: prefs?.tabSize ?? 2,
        wordWrap: prefs?.wordWrap ? 'on' : 'off',
        minimap: { enabled: prefs?.minimap ?? false },
        inlineSuggest: { enabled: true },
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
