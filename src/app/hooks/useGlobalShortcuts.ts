import { useEffect } from 'react';
import { useStore } from '../../store';

/** 全局快捷键：Ctrl/Cmd+J 新对话、Ctrl/Cmd+K 搜索、Esc 关闭搜索。 */
export function useGlobalShortcuts(onOpenSearch: () => void, onCloseSearch: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        useStore.getState().newSession();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
      if (e.key === 'Escape') {
        onCloseSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCloseSearch, onOpenSearch]);
}
