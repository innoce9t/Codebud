import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import type { FileNode, ProjectType } from '../types';
import { buildPreviewDoc } from '../runners/website';
import { buildJsRunnerDoc } from '../runners/javascript';
import { runPython } from '../runners/python';
import { Button } from './ui';

interface Props {
  type: ProjectType;
  files: FileNode[];
}

interface LogLine {
  level: string;
  text: string;
}

export default function OutputPanel({ type, files }: Props) {
  if (type === 'website') return <WebsitePreview files={files} />;
  return <ConsoleRunner type={type} files={files} />;
}

// Vendored Tailwind source, fetched once (same-origin) and shared across previews. It is
// INLINED into the sandboxed preview doc because the iframe (no allow-same-origin) cannot
// fetch it as a cross-origin subresource.
let tailwindSrcPromise: Promise<string> | null = null;
function loadTailwindSrc(): Promise<string> {
  if (!tailwindSrcPromise) {
    tailwindSrcPromise = fetch('/vendor/tailwind.js')
      .then((r) => (r.ok ? r.text() : ''))
      .catch(() => '');
  }
  return tailwindSrcPromise;
}

function WebsitePreview({ files }: { files: FileNode[] }) {
  const [auto, setAuto] = useState(true);
  const [doc, setDoc] = useState('');
  const [tw, setTw] = useState<string | undefined>(undefined);
  const rebuild = () => setDoc(buildPreviewDoc(files, tw));

  useEffect(() => {
    let alive = true;
    loadTailwindSrc().then((src) => alive && setTw(src));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (auto) setDoc(buildPreviewDoc(files, tw));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, auto, tw]);

  // Allow a keyboard shortcut (Ctrl/Cmd+Enter) to refresh the preview.
  useEffect(() => {
    const onRun = () => setDoc(buildPreviewDoc(files, tw));
    window.addEventListener('codebud:run', onRun);
    return () => window.removeEventListener('codebud:run', onRun);
  }, [files, tw]);

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Preview</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-500">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Auto
          </label>
          <Button variant="subtle" className="!py-1 !px-2 text-xs" onClick={rebuild}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>
      <iframe
        title="preview"
        sandbox="allow-scripts allow-modals"
        className="flex-1 bg-white"
        srcDoc={doc}
      />
    </div>
  );
}

function ConsoleRunner({ type, files }: { type: ProjectType; files: FileNode[] }) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const entry = useMemo(
    () => (type === 'python' ? 'main.py' : 'index.js'),
    [type],
  );

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (!e.data?.__codebud) return;
      if (e.data.level === 'done') {
        setRunning(false);
        return;
      }
      setLogs((l) => [...l, { level: e.data.level, text: e.data.text }]);
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  async function run() {
    setLogs([]);
    setRunning(true);
    if (type === 'javascript') {
      const docHtml = buildJsRunnerDoc(files, entry);
      if (iframeRef.current) iframeRef.current.srcdoc = docHtml;
    } else {
      const res = await runPython(files, entry, (msg) =>
        setLogs((l) => [...l, { level: 'info', text: msg }]),
      );
      const lines: LogLine[] = [];
      if (res.output) lines.push({ level: 'log', text: res.output.trimEnd() });
      if (res.error) lines.push({ level: 'error', text: res.error });
      setLogs((l) => [...l, ...lines]);
      setRunning(false);
    }
  }

  // Run via keyboard shortcut (Ctrl/Cmd+Enter) — use a ref to avoid stale files.
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    const onRun = () => runRef.current();
    window.addEventListener('codebud:run', onRun);
    return () => window.removeEventListener('codebud:run', onRun);
  }, []);

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Console — <span className="text-slate-700">{entry}</span>
        </span>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button onClick={() => setLogs([])} className="text-xs text-slate-400 hover:text-slate-700">
              Clear
            </button>
          )}
          <Button onClick={run} disabled={running} className="!py-1 !px-3 text-xs" title="Run (Ctrl/Cmd+Enter)">
            <Play className="h-3.5 w-3.5" /> {running ? 'Running…' : 'Run'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-3 font-mono text-xs leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-slate-400">Press Run to execute {entry}.</p>
        ) : (
          logs.map((l, i) => (
            <pre
              key={i}
              className={`whitespace-pre-wrap ${
                l.level === 'error'
                  ? 'text-red-600'
                  : l.level === 'warn'
                    ? 'text-amber-600'
                    : l.level === 'info'
                      ? 'text-slate-400'
                      : 'text-slate-800'
              }`}
            >
              {l.text}
            </pre>
          ))
        )}
      </div>

      {/* Hidden iframe used to sandbox JS execution. */}
      {type === 'javascript' && (
        <iframe ref={iframeRef} title="js-runner" sandbox="allow-scripts" className="hidden" />
      )}
    </div>
  );
}
