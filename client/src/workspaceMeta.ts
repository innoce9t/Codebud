import type { ProjectType } from './types';

export interface WorkspaceMeta {
  type: ProjectType;
  title: string;
  emoji: string;
  blurb: string;
  gradient: string;
  accent: string;
}

export const WORKSPACES: Record<ProjectType, WorkspaceMeta> = {
  javascript: {
    type: 'javascript',
    title: 'JavaScript Workspace',
    emoji: '🟨',
    blurb: 'Write and run JavaScript with module imports between files.',
    gradient: 'from-yellow-500/20 to-amber-600/10',
    accent: 'text-yellow-400',
  },
  python: {
    type: 'python',
    title: 'Python Workspace',
    emoji: '🐍',
    blurb: 'Build Python projects and execute them in-browser via Pyodide.',
    gradient: 'from-sky-500/20 to-blue-600/10',
    accent: 'text-sky-400',
  },
  website: {
    type: 'website',
    title: 'Website Builder',
    emoji: '🌐',
    blurb: 'HTML, CSS & JS with Tailwind and an instant live preview.',
    gradient: 'from-fuchsia-500/20 to-purple-600/10',
    accent: 'text-fuchsia-400',
  },
};

export const WORKSPACE_LIST = Object.values(WORKSPACES);
