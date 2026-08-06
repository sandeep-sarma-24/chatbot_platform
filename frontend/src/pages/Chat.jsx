import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../api';
import toast from 'react-hot-toast';
import ChatSidebar from '../components/ChatSidebar';

const assistantBubble =
  'rounded-2xl rounded-bl-md px-5 py-3.5 bg-dark-200/50 backdrop-blur-glass border border-white/[0.06] shadow-neon-inner';
const userBubble =
  'rounded-2xl rounded-br-md px-5 py-3 font-medium bg-gradient-to-br from-neon/90 to-neon-dim/85 text-dark shadow-neon';

function AssistantAvatar() {
  return (
    <div className="w-8 h-8 rounded-xl bg-neon/10 border border-neon/25 flex items-center justify-center shrink-0 mt-0.5 shadow-glow-sm animate-glow-pulse">
      <svg className="w-4 h-4 text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    </div>
  );
}

export default function Chat() {
  const { projectId } = useParams();
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const loadConversation = useCallback(async (conversationId) => {
    const res = await api.get(`/chat/${projectId}/conversations/${conversationId}`);
    setActiveConversationId(conversationId);
    setMessages(res.data.messages || []);
  }, [projectId]);

  const createNewConversation = useCallback(async () => {
    setCreating(true);
    try {
      const res = await api.post(`/chat/${projectId}/conversations`);
      const newConv = res.data;
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]);
      return newConv;
    } finally {
      setCreating(false);
    }
  }, [projectId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setMessages([]);
      setConversations([]);
      setActiveConversationId(null);

      try {
        const [convRes, projectRes] = await Promise.all([
          api.get(`/chat/${projectId}/conversations`),
          api.get(`/projects/${projectId}`),
        ]);

        setProjectName(projectRes.data.name);
        const convs = convRes.data.conversations || [];
        setConversations(convs);

        if (convs.length > 0) {
          const sorted = [...convs].sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
          await loadConversation(sorted[0].id);
        } else {
          await createNewConversation();
        }
      } catch (error) {
        toast.error('Failed to load chat');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, loadConversation, createNewConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = async () => {
    try {
      await createNewConversation();
      if (window.matchMedia('(max-width: 767px)').matches) {
        setSidebarOpen(false);
      }
      inputRef.current?.focus();
    } catch (error) {
      toast.error('Failed to create conversation');
    }
  };

  const handleSelectConversation = async (conversationId) => {
    if (conversationId === activeConversationId) {
      if (window.matchMedia('(max-width: 767px)').matches) {
        setSidebarOpen(false);
      }
      return;
    }

    try {
      await loadConversation(conversationId);
      if (window.matchMedia('(max-width: 767px)').matches) {
        setSidebarOpen(false);
      }
    } catch (error) {
      toast.error('Failed to load conversation');
    }
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;

    try {
      await api.delete(`/chat/${projectId}/conversations/${conversationId}`);
      const remaining = conversations.filter((c) => c.id !== conversationId);
      setConversations(remaining);

      if (conversationId === activeConversationId) {
        if (remaining.length > 0) {
          const sorted = [...remaining].sort(
            (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
          );
          await loadConversation(sorted[0].id);
        } else {
          await createNewConversation();
        }
      }

      toast.success('Conversation deleted');
    } catch (error) {
      toast.error('Failed to delete conversation');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending || !activeConversationId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);

    try {
      const res = await api.post(`/chat/${projectId}/conversations/${activeConversationId}`, {
        message: userMessage,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);

      if (res.data.conversation) {
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === res.data.conversation.id ? { ...c, ...res.data.conversation } : c
          );
          return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        });
      }
    } catch (error) {
      const errMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to get response';
      toast.error(errMsg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="relative flex h-[calc(100vh-56px)] bg-dark overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        creating={creating}
      />

      <div className="relative flex flex-col flex-1 min-w-0 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-radial from-neon/[0.04] via-transparent to-transparent"
          aria-hidden
        />

        <header className="relative z-10 shrink-0 bg-dark-100/60 backdrop-blur-glass-lg px-5 py-3.5 flex items-center gap-3">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-dark-800 hover:text-neon hover:bg-neon/5 transition-all duration-200"
              title="Open sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <Link
            to={`/project/${projectId}`}
            className="p-1.5 -ml-1.5 rounded-lg text-dark-800 hover:text-neon hover:bg-neon/5 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <div className="w-9 h-9 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center shadow-glow-sm">
            <svg className="w-4 h-4 text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm text-white truncate">
              {activeConversation?.title || projectName || 'Chat'}
            </h2>
            <p className="text-xs text-dark-700">{messages.length} messages</p>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon/25 to-transparent" />
        </header>

        <div className="relative flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="dot-pulse flex items-center gap-1.5 h-2">
                <span className="w-2 h-2 bg-neon/90 rounded-full inline-block" />
                <span className="w-2 h-2 bg-neon/90 rounded-full inline-block" />
                <span className="w-2 h-2 bg-neon/90 rounded-full inline-block" />
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-5 py-8 space-y-8">
              {messages.length === 0 && !sending && (
                <div className="relative text-center mt-24 animate-fade-in">
                  <div className="relative mx-auto mb-6 w-fit">
                    <div
                      className="absolute -inset-12 rounded-full bg-neon/20 blur-3xl animate-pulse-glow"
                      aria-hidden
                    />
                    <div className="relative w-20 h-20 rounded-2xl bg-dark-200/60 backdrop-blur-glass border border-neon/30 flex items-center justify-center shadow-neon-lg animate-glow">
                      <svg className="w-10 h-10 text-neon/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Start a conversation</h3>
                  <p className="text-sm text-dark-700 max-w-sm mx-auto leading-relaxed">
                    Your agent will use prompts and uploaded documents as context.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3.5 animate-fade-in ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && <AssistantAvatar />}

                  <div className={`max-w-[82%] ${msg.role === 'user' ? userBubble : assistantBubble}`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-li:my-0.5 prose-pre:my-2">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-dark-300/80 border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-dark-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex gap-3.5 animate-fade-in">
                  <AssistantAvatar />
                  <div className={`${assistantBubble} py-4`}>
                    <div className="dot-pulse flex items-center gap-1.5 h-2">
                      <span className="w-2 h-2 bg-neon/90 rounded-full inline-block" />
                      <span className="w-2 h-2 bg-neon/90 rounded-full inline-block" />
                      <span className="w-2 h-2 bg-neon/90 rounded-full inline-block" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="relative z-10 shrink-0 px-4 pb-5 pt-2">
          <form
            onSubmit={handleSend}
            className="max-w-3xl mx-auto flex gap-2.5 p-2.5 rounded-2xl bg-dark-200/45 backdrop-blur-glass-lg border border-white/[0.06] shadow-[0_-12px_40px_rgba(0,0,0,0.45),0_0_1px_rgba(0,255,136,0.08)]"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send)"
              className="flex-1 px-4 py-3 bg-dark-100/50 border border-white/[0.06] rounded-xl text-white text-sm resize-none placeholder:text-dark-700 transition-all duration-200 focus:outline-none focus:border-neon/40 focus:shadow-[0_0_0_3px_rgba(0,255,136,0.12),0_0_20px_rgba(0,255,136,0.08)]"
              rows={1}
              disabled={sending || loading}
            />
            <button
              type="submit"
              disabled={sending || loading || !input.trim()}
              className="px-4 py-3 bg-gradient-to-br from-neon to-neon-dim text-dark rounded-xl font-semibold transition-all duration-200 hover:shadow-neon-lg hover:brightness-110 disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:brightness-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
