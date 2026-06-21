import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Bot } from 'lucide-react';
import Sidebar from './Sidebar';
import GlobalChatDrawer from './GlobalChatDrawer';
import { ChatProvider, useChatContext } from '../context/ChatContext';
import { useAuth } from '../auth';
import { useIsMobile } from '../hooks/useIsMobile';
import { eventToCombo, formatCombo, resolveBindings } from '../keybindings';

const STORAGE_KEY = 'cb-sidebar-collapsed';

function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { chatOpen, drawerWidth, openChat, closeChat } = useChatContext();
  const isMobile = useIsMobile();

  const isEditor = pathname.startsWith('/project/');

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  const handleTabClick = useCallback(() => {
    // Simply toggle the drawer. The open panel itself handles the no-AI state
    // ("Please connect AI model to enable ai chat" + a button to AI Models).
    if (chatOpen) closeChat();
    else openChat();
  }, [chatOpen, openChat, closeChat]);

  // Global keybinding to open/close the AI chat from any page.
  const tabClickRef = useRef(handleTabClick);
  tabClickRef.current = handleTabClick;
  useEffect(() => {
    const toggleCombo = resolveBindings(user?.preferences?.keybindings).toggleChat;
    function onKey(e: KeyboardEvent) {
      if (eventToCombo(e) === toggleCombo) {
        e.preventDefault();
        tabClickRef.current();
      }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [user?.preferences?.keybindings]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={isEditor ? true : collapsed} onToggle={toggle} locked={isEditor} />

      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>

      <GlobalChatDrawer />

      {/* Right-edge pull tab. On phones the open chat is a full-screen overlay with its own
          close button, so hide the tab while it's open; otherwise offset it by the drawer width. */}
      {!(chatOpen && isMobile) && (
        <button
          onClick={handleTabClick}
          title={`${chatOpen ? 'Close' : 'Open'} AI chat (${formatCombo(
            resolveBindings(user?.preferences?.keybindings).toggleChat,
          )})`}
          style={{ right: chatOpen && !isMobile ? drawerWidth : 0 }}
          className={`fixed top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-xl px-1.5 py-4 shadow-md transition-[right,background-color] duration-150 ${
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
