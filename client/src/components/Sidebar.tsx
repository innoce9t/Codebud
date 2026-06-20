import { NavLink, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Bot,
  Code2,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
} from 'lucide-react';
import { useAuth } from '../auth';

// Primary actions, then a divider, then the rest.
const TOP_NAV = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/new', label: 'New Project', Icon: Plus, end: false },
];
const MAIN_NAV = [
  { to: '/workspaces', label: 'Workspaces', Icon: LayoutGrid, end: false },
  { to: '/ai-models', label: 'AI Models', Icon: Bot, end: false },
  { to: '/settings', label: 'Settings', Icon: Settings, end: false },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  locked?: boolean;
}

function navClass(collapsed: boolean) {
  return ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
    } ${collapsed ? 'justify-center' : ''}`;
}

export default function Sidebar({ collapsed, onToggle, locked = false }: Props) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Header / logo + collapse toggle */}
      <div
        className={`flex h-14 items-center border-b border-slate-200 px-3 ${
          collapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {(!collapsed || locked) && (
          <button
            onClick={() => nav('/')}
            className="flex items-center gap-2 font-bold text-slate-900"
            title="CodeBud — home"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Code2 className="h-4 w-4" />
            </span>
            {!collapsed && 'CodeBud'}
          </button>
        )}
        {!locked && (
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        )}
      </div>

      {/* Nav: Dashboard, New Project — divider — Workspaces, AI Models, Settings */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-1">
          {TOP_NAV.map(({ to, label, Icon, end }) => {
            const accent = to === '/new';
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={label}
                className={
                  accent
                    ? `flex items-center gap-3 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 ${
                        collapsed ? 'justify-center' : ''
                      }`
                    : navClass(collapsed)
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            );
          })}
        </div>

        <div className="my-3 border-t border-slate-200" />

        <div className="space-y-1">
          {MAIN_NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} title={label} className={navClass(collapsed)}>
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Documentation (dummy external link) at the end */}
      <div className="px-3 pb-2">
        <a
          href="https://docs.codebud.dev"
          target="_blank"
          rel="noreferrer"
          title="Documentation"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <BookOpen className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Documentation</span>}
        </a>
      </div>

      {/* Profile card (click to open Profile) + logout */}
      <div className="border-t border-slate-200 p-3">
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          <NavLink
            to="/profile"
            title="Profile"
            className={({ isActive }) =>
              `flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 transition hover:bg-slate-100 ${
                isActive ? 'bg-brand-50' : ''
              } ${collapsed ? 'flex-none justify-center' : ''}`
            }
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {initial}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">{user?.name}</span>
                <span className="block truncate text-xs text-slate-400">{user?.email}</span>
              </span>
            )}
          </NavLink>
          {!collapsed && (
            <button
              onClick={async () => {
                await logout();
                nav('/login');
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
