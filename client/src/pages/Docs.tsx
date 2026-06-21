import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Bot,
  KeyRound,
  LayoutGrid,
  Palette,
  Play,
  Share2,
  Smartphone,
  FileCode2,
} from 'lucide-react';
import { PageHeader } from '../components/ui';

interface Section {
  id: string;
  title: string;
  Icon: typeof BookOpen;
  body: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    Icon: BookOpen,
    body: (
      <>
        <p>
          CodeBud is an AI-assisted coding workspace with three environments — <b>JavaScript</b>,{' '}
          <b>Python</b>, and a <b>Website Builder</b> (HTML/CSS/JS + Tailwind). Sign up, then pick a
          workspace card on the dashboard to create your first project.
        </p>
        <p>Everything you create is private to your account and saved automatically.</p>
      </>
    ),
  },
  {
    id: 'workspaces',
    title: 'Workspaces & projects',
    Icon: LayoutGrid,
    body: (
      <>
        <p>
          From <b>New Project</b> choose a workspace type, then start from a quick-start template or
          a blank project. Each workspace lists your projects, which you can <b>search</b>, <b>filter</b>{' '}
          (owned by you vs. shared) and <b>sort</b> (recently updated/created, or by name).
        </p>
        <p>Open a project to enter the editor; delete one from its card.</p>
      </>
    ),
  },
  {
    id: 'editor',
    title: 'The editor & files',
    Icon: FileCode2,
    body: (
      <>
        <p>
          Each project has a file explorer, a Monaco code editor, and a console/preview panel. You can
          create, rename, delete and <b>upload</b> files; edits <b>autosave</b> to the database. Files
          can import each other within a project (e.g. <code>./utils.js</code> or a Python module).
        </p>
        <p>
          Every save snapshots the previous version — open <b>History</b> to browse and restore. File
          types are validated per workspace (e.g. a Python project won&apos;t accept a stray{' '}
          <code>.ts</code> file).
        </p>
        <p>On a phone the editor switches to tabs: Files, Editor and Preview/Console.</p>
      </>
    ),
  },
  {
    id: 'running',
    title: 'Running your code',
    Icon: Play,
    body: (
      <>
        <p>
          Code runs <b>in your browser</b>, sandboxed — no server execution. JavaScript runs in an
          isolated iframe, Python runs via Pyodide (CPython in WebAssembly), and websites get a live
          preview that updates as you edit.
        </p>
        <p>
          Press <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs">Ctrl/Cmd+Enter</kbd>{' '}
          or the Run control in the Console/Preview panel.
        </p>
      </>
    ),
  },
  {
    id: 'ai',
    title: 'AI assistant',
    Icon: Bot,
    body: (
      <>
        <p>
          Connect a provider key (Claude, GPT, or Gemini) — or a custom OpenAI-compatible/local
          endpoint — under <b>Settings → AI Settings</b>, then pick the active model on the{' '}
          <b>AI Models</b> page. Tune temperature, response length and behaviour there too.
        </p>
        <p>
          Inside a project the chat sees your files and can answer questions, suggest improvements, and
          edit files. Choose a mode: <b>Ask</b> (read-only), <b>Plan</b> (outline first), or{' '}
          <b>Agent</b> (makes changes — with optional approval before applying). Each project keeps its
          own chat sessions.
        </p>
        <p>
          Outside a project, the general chat can help you get around and take actions like changing
          theme or creating a project.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Collaboration & sharing',
    Icon: Share2,
    body: (
      <>
        <p>
          Share a project from the editor: invite specific people by email, or enable a “anyone with
          the link” share (Google-Docs style) and copy the link. Collaborators edit in real time —
          file changes and presence sync live over WebSockets.
        </p>
      </>
    ),
  },
  {
    id: 'customization',
    title: 'Customization',
    Icon: Palette,
    body: (
      <>
        <p>
          On the <b>Theme</b> page switch between light/dark/system and choose an accent — including a
          custom color picker. In <b>Settings</b> adjust editor preferences (font size, tab size, word
          wrap, minimap, AI completions) and remap keyboard shortcuts.
        </p>
      </>
    ),
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    Icon: KeyRound,
    body: (
      <>
        <p>
          Common actions have shortcuts — run code, save, toggle the output panel, open/focus the AI
          chat, and switch files. Inside a project press{' '}
          <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs">?</kbd>{' '}
          for the full list, and customize them under <b>Settings → Editor → Keyboard shortcuts</b>.
        </p>
      </>
    ),
  },
  {
    id: 'install',
    title: 'Install as an app (PWA)',
    Icon: Smartphone,
    body: (
      <>
        <p>
          CodeBud is a Progressive Web App. In a supported browser, use the install icon in the address
          bar (or “Add to Home Screen” on mobile) to install it like a native app — it opens in its own
          window and works for already-visited pages when offline.
        </p>
      </>
    ),
  },
];

export default function Docs() {
  const nav = useNavigate();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">
      <PageHeader title="Documentation" subtitle="How to use CodeBud — workspaces, the editor, AI, and more." />

      {/* Table of contents */}
      <nav className="mb-8 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">On this page</p>
        <div className="grid gap-1 sm:grid-cols-2">
          {SECTIONS.map(({ id, title, Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Icon className="h-4 w-4 text-brand-600" /> {title}
            </a>
          ))}
        </div>
      </nav>

      <div className="space-y-6">
        {SECTIONS.map(({ id, title, Icon, body }) => (
          <section key={id} id={id} className="scroll-mt-6 rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Icon className="h-5 w-5 text-brand-600" /> {title}
            </h2>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600 [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs">
              {body}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-sm text-slate-400">
        Need to set things up?{' '}
        <button onClick={() => nav('/settings#ai')} className="font-medium text-brand-600 hover:underline">
          Open AI Settings
        </button>{' '}
        or{' '}
        <button onClick={() => nav('/new')} className="font-medium text-brand-600 hover:underline">
          create a project
        </button>
        .
      </p>
    </div>
  );
}
