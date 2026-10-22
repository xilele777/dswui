import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store';

/** 顶栏对话标题的内联重命名。 */
export function useTitleEditor(sessionId: string | undefined, title: string | undefined) {
  const renameSession = useStore((s) => s.renameSession);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditing(false);
  }, [sessionId]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const begin = () => {
    setDraft(title ?? '');
    setEditing(true);
  };

  const commit = () => {
    const next = draft.trim();
    if (sessionId && next && next !== title) renameSession(sessionId, next);
    setEditing(false);
  };

  return {
    editing,
    draft,
    setDraft,
    inputRef,
    begin,
    commit,
    cancel: () => setEditing(false),
  };
}
