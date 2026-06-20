import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ChatContextValue {
  chatOpen: boolean;
  chatProjectId: string | null;
  onFilesChanged: (() => void) | null;
  openChat: (projectId?: string, onFilesChanged?: () => void) => void;
  closeChat: () => void;
  toggleChat: () => void;
  setChatProject: (projectId: string, onFilesChanged?: () => void) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatProjectId, setChatProjectId] = useState<string | null>(null);
  const [onFilesChanged, setOnFilesChanged] = useState<(() => void) | null>(null);

  const openChat = useCallback((projectId?: string, cb?: () => void) => {
    if (projectId) setChatProjectId(projectId);
    if (cb) setOnFilesChanged(() => cb);
    setChatOpen(true);
  }, []);

  const closeChat = useCallback(() => setChatOpen(false), []);

  const toggleChat = useCallback(() => setChatOpen((o) => !o), []);

  const setChatProject = useCallback((projectId: string, cb?: () => void) => {
    setChatProjectId(projectId);
    if (cb) setOnFilesChanged(() => cb);
  }, []);

  return (
    <ChatContext.Provider
      value={{ chatOpen, chatProjectId, onFilesChanged, openChat, closeChat, toggleChat, setChatProject }}
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
