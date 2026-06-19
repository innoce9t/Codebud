import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const STORAGE_KEY = 'cb-sidebar-collapsed';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const { pathname } = useLocation();

  // Inside the project IDE the sidebar is locked to its collapsed icon rail to
  // leave maximum room for the editor, file tree and chat.
  const isEditor = pathname.startsWith('/project/');

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={isEditor ? true : collapsed} onToggle={toggle} locked={isEditor} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
