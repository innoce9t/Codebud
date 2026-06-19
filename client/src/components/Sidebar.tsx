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
  User,
} from 'lucide-react';
import { useAuth } from '../auth';

const NAV = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/ai-models', label: 'AI Models', Icon: Bot, end: false },
  { to: '/workspaces', label: 'Workspaces', Icon: LayoutGrid, end: false },
  { to: '/settings', label: 'Settings', Icon: Settings, end: false },
  { to: '/profile', label: 'Profile', Icon: User, end: false },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: Props) {
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
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3">
        {!collapsed && (
          <button onClick={() => nav('/')} className="flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Code2 className="h-4 w-4" />
            </span>
            CodeBud
          </button>
        )}
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {/* New project button */}
      <div className="p-3">
        <NavLink
          to="/new"
          className={`flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 font-medium text-white shadow-sm transition hover:bg-brand-700 ${
            collapsed ? 'justify-center' : ''
          }`}
          title="New project"
        >
          <Plus className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="text-sm">New project</span>}
        </NavLink>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Documentation (dummy external link) */}
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

      {/* User card + logout */}
      <div className="border-t border-slate-200 p-3">
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
            {initial}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          )}
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
