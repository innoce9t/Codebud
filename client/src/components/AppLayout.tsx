import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import Sidebar from './Sidebar';
import GlobalChatDrawer from './GlobalChatDrawer';
import { ChatProvider, useChatContext } from '../context/ChatContext';
import { useAuth } from '../auth';

const STORAGE_KEY = 'cb-sidebar-collapsed';

function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { user } = useAuth();
  const { chatOpen, openChat, closeChat } = useChatContext();

  const isEditor = pathname.startsWith('/project/');

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  function handleTabClick() {
    if (chatOpen) {
      closeChat();
      return;
    }
    // Gate: if no AI model is connected, send to AI Models page instead.
    if (!user?.activeModel) {
      nav('/ai-models');
      return;
    }
    openChat();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={isEditor ? true : collapsed} onToggle={toggle} locked={isEditor} />

      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <GlobalChatDrawer />

      {/* Right-edge pull tab — centered vertically, always visible */}
      <button
        onClick={handleTabClick}
        title={chatOpen ? 'Close AI chat' : 'Open AI chat'}
        className={`fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-xl px-1.5 py-4 shadow-md transition-colors ${
          chatOpen
            ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        <Bot className="h-4 w-4" />
        <span className="rotate-180 text-[10px] font-semibold uppercase tracking-wider [writing-mode:vertical-rl]">
          AI Chat
        </span>
      </button>
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
