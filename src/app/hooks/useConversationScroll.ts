import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { UIEvent } from 'react';
import type { Message } from '../../types';

/** 滚动区域状态、自动跟随、右侧对话目录的高亮与跳转。 */
export function useConversationScroll(messages: Message[], sessionId?: string) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  const [navActive, setNavActive] = useState<string | null>(null);

  const navItems = useMemo(
    () =>
      messages
        .filter((m) => m.role === 'user' && m.content.trim())
        .map((m) => {
          const line = m.content.trim().split('\n')[0].replace(/\s+/g, ' ');
          return { id: m.id, title: line.length > 52 ? `${line.slice(0, 52)}…` : line };
        }),
    [messages],
  );

  const updateNavActive = useCallback(() => {
    const area = scrollRef.current;
    if (!area || !navItems.length) return;
    const line = area.getBoundingClientRect().top + 96;
    let active = navItems[0].id;
    for (const item of navItems) {
      const el = area.querySelector<HTMLElement>(`[data-mid="${item.id}"]`);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= line) active = item.id;
      else break;
    }
    setNavActive(active);
  }, [navItems]);

  useEffect(() => {
    updateNavActive();
  }, [updateNavActive, sessionId]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    atBottomRef.current = true;
    setAtBottom(true);
  }, []);

  // 观察实际渲染高度，同时覆盖思考、来源、Markdown 节流与折叠变化。
  useEffect(() => {
    const content = scrollRef.current?.firstElementChild;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) scrollToBottom(false);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [sessionId, scrollToBottom]);

  // 切换会话时回到最新位置
  useEffect(() => {
    atBottomRef.current = true;
    setAtBottom(true);
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sessionId]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = near;
    setAtBottom(near);
    updateNavActive();
  };

  const jumpTo = (messageId: string) => {
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-mid="${messageId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setNavActive(messageId);
  };

  return {
    scrollRef,
    atBottom,
    navItems,
    navActive,
    handleScroll,
    scrollToBottom,
    jumpTo,
  };
}
