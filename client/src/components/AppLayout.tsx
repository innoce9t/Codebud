import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Bot } from 'lucide-react';
import Sidebar from './Sidebar';
import GlobalChatDrawer from './GlobalChatDrawer';
import { ChatProvider, useChatContext } from '../context/ChatContext';

const STORAGE_KEY = 'cb-sidebar-collapsed';

function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const { pathname } = useLocation();
  const { chatOpen, toggleChat } = useChatContext();

  // Inside the project IDE the sidebar is locked to its collapsed icon rail.
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

      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <GlobalChatDrawer />

      {/* Floating chat toggle — bottom-right of the viewport */}
      {!chatOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 hover:scale-105 active:scale-95"
          title="Open AI chat"
        >
          <Bot className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export default function AppLayout() {
  return (
    <ChatProvider>
      <Layout />
    </ChatProvider>
  );
}
