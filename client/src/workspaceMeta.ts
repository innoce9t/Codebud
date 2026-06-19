import { FileCode2, FileTerminal, Globe, type LucideIcon } from 'lucide-react';
import type { ProjectType } from './types';

export interface WorkspaceMeta {
  type: ProjectType;
  title: string;
  Icon: LucideIcon;
  blurb: string;
  gradient: string;
  accent: string;
  iconBg: string;
}

export const WORKSPACES: Record<ProjectType, WorkspaceMeta> = {
  javascript: {
    type: 'javascript',
    title: 'JavaScript Workspace',
    Icon: FileCode2,
    blurb: 'Write and run JavaScript with module imports between files.',
    gradient: 'from-amber-50 to-amber-100/40',
    accent: 'text-amber-600',
    iconBg: 'bg-amber-100 text-amber-600',
  },
  python: {
    type: 'python',
    title: 'Python Workspace',
    Icon: FileTerminal,
    blurb: 'Build Python projects and execute them in-browser via Pyodide.',
    gradient: 'from-sky-50 to-sky-100/40',
    accent: 'text-sky-600',
    iconBg: 'bg-sky-100 text-sky-600',
  },
  website: {
    type: 'website',
    title: 'Website Builder',
    Icon: Globe,
    blurb: 'HTML, CSS & JS with Tailwind and an instant live preview.',
    gradient: 'from-fuchsia-50 to-fuchsia-100/40',
    accent: 'text-fuchsia-600',
    iconBg: 'bg-fuchsia-100 text-fuchsia-600',
  },
};

export const WORKSPACE_LIST = Object.values(WORKSPACES);
