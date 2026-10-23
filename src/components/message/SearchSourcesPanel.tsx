import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { WebSource } from '../../types';
import { IconClose, IconGlobe } from '../Icons';

export function sourceHost(source: WebSource): string {
  try { return new URL(source.url).hostname.replace(/^www\./, ''); } catch { return source.url; }
}

/** 本地生成站点标记，避免仅展开来源就向第三方泄露浏览信息。 */
export function SourceMark({ source }: { source: WebSource }) {
  const host = sourceHost(source);
  const hue = Array.from(host).reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 360, 0);
  return <span className="source-mark" style={{ color: `hsl(${hue} 40% 42%)` }} aria-hidden="true">{host.charAt(0).toUpperCase() || <IconGlobe />}</span>;
}

const SearchPanelContext = createContext<(sources: WebSource[], trigger: HTMLButtonElement) => void>(() => {});
export const useSearchPanel = () => useContext(SearchPanelContext);

export function SearchSourcesProvider({ children, conversationId }: { children: ReactNode; conversationId?: string | null }) {
  const [sources, setSources] = useState<WebSource[] | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const close = useCallback(() => {
    setSources(null);
    if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
  }, []);
  useEffect(() => { setSources(null); }, [conversationId]);
  useEffect(() => {
    if (!sources) return;
    closeButton.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sources, close]);

  return <SearchPanelContext.Provider value={(items, button) => { trigger.current = button; setSources(items); }}>
    {children}
    {sources && createPortal(<aside className="search-sources-panel" aria-labelledby={titleId}>
      <header className="search-sources-header">
        <h2 id={titleId}>搜索结果</h2>
        <button ref={closeButton} className="icon-btn" type="button" aria-label="关闭搜索结果" onClick={close}><IconClose /></button>
      </header>
      <div className="search-sources-list">
        {sources.map((source, index) => <a className="search-source-card" key={source.url} href={source.url} target="_blank" rel="noreferrer">
          <div className="search-source-meta"><SourceMark source={source} /><span>{source.siteName || sourceHost(source)}</span><span className="search-source-number">{index + 1}</span></div>
          <div className="search-source-title">{source.title}</div>
          {source.publishedAt && <div className="search-source-date">{source.publishedAt}</div>}
          {source.snippet && <div className="search-source-snippet">{source.snippet}</div>}
        </a>)}
      </div>
    </aside>, document.body)}
  </SearchPanelContext.Provider>;
}
