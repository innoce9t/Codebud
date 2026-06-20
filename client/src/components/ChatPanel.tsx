import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, MessageSquare, Send } from 'lucide-react';
import { chatApi } from '../api';
import { Spinner } from './ui';
import type { ChatMessage } from '../types';

interface Props {
  projectId: string;
  onFilesChanged?: () => void;
  hideHeader?: boolean;
}

export default function ChatPanel({ projectId, onFilesChanged, hideHeader }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatApi.history(projectId).then((m) => {
      setMessages(m);
      setLoaded(true);
    });
  }, [projectId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    // Optimistic user bubble.
    const optimistic: ChatMessage = {
      _id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await chatApi.send(projectId, text);
      setMessages((m) => [
        ...m.filter((x) => x._id !== optimistic._id),
        res.userMessage,
        res.assistantMessage,
      ]);
      if (res.edits.length) onFilesChanged?.();
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          _id: `err-${Date.now()}`,
          role: 'assistant',
          content: `${(err as Error).message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    if (!confirm('Clear chat history?')) return;
    await chatApi.clear(projectId);
    setMessages([]);
  }

  return (
    <div className="flex h-full flex-col bg-surface">
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Bot className="h-4 w-4 text-brand-600" /> AI Assistant
          </span>
          {messages.length > 0 && (
            <button onClick={clearChat} className="text-xs text-slate-400 hover:text-red-500">
              Clear
            </button>
          )}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto p-3">
        {!loaded ? (
          <div className="flex justify-center pt-8">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="px-2 pt-6 text-center text-sm text-slate-400">
            <MessageSquare className="mx-auto mb-2 h-7 w-7 text-slate-300" />
            Ask me about your code, request changes, or say{' '}
            <em className="text-slate-500">"create a file called helpers.js"</em>. I can read and edit
            your project files.
          </div>
        ) : (
          messages.map((m) => <Bubble key={m._id} msg={m} />)
        )}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Spinner /> Thinking…
          </div>
        )}
      </div>

      <form onSubmit={send} className="border-t border-slate-200 p-2">
        <div className="flex items-end gap-2">
          <textarea
            id="cb-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(e);
              }
            }}
            rows={2}
            placeholder="Ask the AI… (Enter to send)"
            className="flex-1 resize-none rounded-lg border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex items-center justify-center rounded-lg bg-brand-600 p-2.5 text-white hover:bg-brand-700 disabled:opacity-50"
            title="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-sm ${
          isUser ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
            {msg.edits && msg.edits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {msg.edits.map((e, i) => (
                  <span
                    key={i}
                    className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700"
                  >
                    {e.action} {e.path}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
