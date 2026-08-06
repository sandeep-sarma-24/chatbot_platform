function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function truncateTitle(title, maxLength = 32) {
  if (!title) return 'New Chat';
  if (title.length <= maxLength) return title;
  return `${title.slice(0, maxLength)}…`;
}

export default function ChatSidebar({
  conversations,
  activeConversationId,
  isOpen,
  onToggle,
  onSelect,
  onNewChat,
  onDelete,
  creating,
}) {
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onToggle}
          aria-hidden
        />
      )}

      <aside
        className={`
          fixed md:relative z-40 md:z-0
          flex flex-col h-full
          bg-dark-100/80 backdrop-blur-glass border-r border-white/[0.06]
          transition-all duration-200
          ${isOpen ? 'w-[260px] translate-x-0' : 'w-0 md:w-0 -translate-x-full md:translate-x-0 overflow-hidden'}
        `}
      >
        <div className="flex flex-col h-full w-[260px]">
          <div className="shrink-0 p-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNewChat}
                disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-neon to-neon-dim text-dark text-sm font-semibold transition-all duration-200 hover:shadow-neon-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Chat
              </button>
              <button
                type="button"
                onClick={onToggle}
                className="p-2 rounded-lg text-dark-700 hover:text-neon hover:bg-white/[0.03] transition-all duration-200"
                title="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
            {sortedConversations.length === 0 ? (
              <p className="px-4 py-6 text-sm text-dark-700 text-center">No conversations yet</p>
            ) : (
              <ul className="space-y-0.5 px-2">
                {sortedConversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <li key={conv.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect(conv.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelect(conv.id);
                          }
                        }}
                        className={`
                          group w-full flex items-start gap-2 px-3 py-2.5 rounded-lg text-left cursor-pointer
                          transition-all duration-200
                          ${isActive
                            ? 'bg-neon/10 border-l-2 border-neon pl-[10px]'
                            : 'border-l-2 border-transparent hover:bg-white/[0.03]'}
                        `}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{truncateTitle(conv.title)}</p>
                          <p className="text-xs text-dark-700 mt-0.5">{formatRelativeTime(conv.updatedAt)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => onDelete(conv.id, e)}
                          className="shrink-0 p-1 rounded-md text-dark-700 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-white/[0.04] transition-all duration-200"
                          title="Delete conversation"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
