import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store';
import { useEscapeKey } from '../../lib/useEscapeKey';
import { Overlay } from '../ui/Overlay';
import { IconSearch } from '../Icons';

export function ConversationSearchDialog({ onClose }: { onClose: () => void }) {
  const sessions = useStore((s) => s.sessions);
  const selectSession = useStore((s) => s.selectSession);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return sessions
      .filter((s) => s.messages.length > 0)
      .flatMap((s) => {
        const match =
          s.title.toLowerCase().includes(q) || s.messages.some((m) => m.content.toLowerCase().includes(q));
        if (!match) return [];
        const hit = s.messages.find((m) => m.content.toLowerCase().includes(q));
        return [{ session: s, snippet: hit?.content || s.title }];
      })
      .slice(0, 30);
  }, [sessions, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEscapeKey(onClose);

  return (
    <Overlay className="search-overlay" onClose={onClose}>
      <div className="search-dialog" role="dialog" aria-modal="true" aria-label="搜索对话">
        <div className="search-dialog-input">
          <IconSearch />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索对话内容..."
          />
          <button onClick={onClose} title="关闭搜索" aria-label="关闭搜索">
            ×
          </button>
        </div>
        {query && (
          <div className="search-results" role="list" aria-label="搜索结果">
            {results.length ? (
              results.map(({ session: s, snippet }) => (
                <button
                  key={s.id}
                  className="search-result"
                  onClick={() => {
                    selectSession(s.id);
                    onClose();
                  }}
                >
                  <span className="search-result-icon">
                    <IconSearch />
                  </span>
                  <span className="search-result-copy">
                    <strong>{s.title}</strong>
                    <span>{snippet.slice(0, 100)}</span>
                  </span>
                  <time>
                    {new Date(s.updatedAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </button>
              ))
            ) : (
              <div className="search-empty">没有找到相关对话</div>
            )}
          </div>
        )}
      </div>
    </Overlay>
  );
}
