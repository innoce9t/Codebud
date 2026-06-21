import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type ChatMode = 'ask' | 'plan' | 'agent';
export type ApprovalMode = 'auto' | 'review';

interface ChatContextValue {
  chatOpen: boolean;
  activeSessionId: string | null;
  currentProjectId: string | null;
  chatMode: ChatMode;
  approvalMode: ApprovalMode;
  drawerWidth: number;
  onFilesChanged: (() => void) | null;
  openChat: (sessionId?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  setActiveSession: (sessionId: string) => void;
  setCurrentProject: (projectId: string | null) => void;
  setChatMode: (mode: ChatMode) => void;
  setApprovalMode: (mode: ApprovalMode) => void;
  setDrawerWidth: (w: number) => void;
  setOnFilesChanged: (cb: (() => void) | null) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const DEFAULT_DRAWER_WIDTH = 320;

function readStoredWidth(): number {
  const stored = parseInt(localStorage.getItem('cb-chat-width') ?? '', 10);
  return isNaN(stored) ? DEFAULT_DRAWER_WIDTH : Math.max(240, Math.min(600, stored));
}

const OPEN_KEY = 'cb-chat-open';
// Open by default; a manual close is remembered across pages and reloads.
function readStoredOpen(): boolean {
  return localStorage.getItem(OPEN_KEY) !== '0';
}
function persistOpen(open: boolean): boolean {
  localStorage.setItem(OPEN_KEY, open ? '1' : '0');
  return open;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(readStoredOpen);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>('ask');
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('auto');
  const [onFilesChanged, setOnFilesChanged] = useState<(() => void) | null>(null);
  const [drawerWidth, setDrawerWidth] = useState<number>(readStoredWidth);

  const openChat = useCallback((sessionId?: string) => {
    if (sessionId) setActiveSessionId(sessionId);
    setChatOpen(persistOpen(true));
  }, []);

  const closeChat = useCallback(() => setChatOpen(persistOpen(false)), []);
  const toggleChat = useCallback(() => setChatOpen((o) => persistOpen(!o)), []);

  const setActiveSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setChatOpen(persistOpen(true));
  }, []);

  const setCurrentProject = useCallback((projectId: string | null) => {
    setCurrentProjectId(projectId);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chatOpen, activeSessionId, currentProjectId, chatMode, approvalMode, drawerWidth, onFilesChanged,
        openChat, closeChat, toggleChat, setActiveSession, setCurrentProject,
        setChatMode, setApprovalMode, setDrawerWidth,
        setOnFilesChanged: (cb) => setOnFilesChanged(() => cb),
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext used outside ChatProvider');
  return ctx;
}
