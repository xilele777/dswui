import type { RefObject } from 'react';

interface Props {
  title?: string;
  sidebarOpen: boolean;
  editing: boolean;
  draft: string;
  setDraft: (value: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  begin: () => void;
  commit: () => void;
  cancel: () => void;
}

export function ConversationHeader({
  title,
  sidebarOpen,
  editing,
  draft,
  setDraft,
  inputRef,
  begin,
  commit,
  cancel,
}: Props) {
  return (
    <div className={`topbar conversation-topbar ${sidebarOpen ? '' : 'sidebar-is-collapsed'}`}>
      <div className="conversation-title-wrap">
        {editing ? (
          <div className="conversation-title-editor" data-value={draft || '新对话'}>
            <input
            ref={inputRef}
            className="conversation-title-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') cancel();
            }}
            />
          </div>
        ) : (
          <button className="conversation-title" onClick={begin} title="点击修改对话标题">
            {title}
          </button>
        )}
      </div>
    </div>
  );
}
