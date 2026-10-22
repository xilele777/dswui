import { useRef } from 'react';
import type { Session } from '../../types';
import { copyText } from '../../lib/clipboard';
import { sessionToMarkdown } from '../../lib/export';
import { toast } from '../Toast';
import { IconCheck, IconMore, IconPin } from '../Icons';
import { SessionMenu } from './SessionMenu';
import type { SessionController } from './types';

interface Props {
  session: Session;
  active: boolean;
  controller: SessionController;
}

export function SessionItem({ session, active, controller }: Props) {
  const menuAnchor = useRef<HTMLButtonElement>(null);
  const { editingId, draft, menuId, multi, selected } = controller;
  const checked = selected.has(session.id);
  const editing = editingId === session.id;
  const menuOpen = menuId === session.id;

  return (
    <div
      className={`session-item ${active && !multi ? 'active' : ''} ${multi ? 'selecting' : ''} ${menuOpen ? 'menu-open' : ''}`}
      role={multi ? 'checkbox' : undefined}
      aria-checked={multi ? checked : undefined}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          controller.select(session.id);
        }
      }}
      onClick={() => controller.select(session.id)}
      onDoubleClick={() => {
        if (!multi) controller.startRename(session.id, session.title);
      }}
      title={multi ? undefined : session.title}
    >
      {editing ? (
        <input
          className="rename"
          autoFocus
          value={draft}
          onChange={(e) => controller.setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={() => controller.commitRename(session.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') controller.commitRename(session.id);
            if (e.key === 'Escape') controller.cancelRename();
          }}
        />
      ) : (
        <>
          {multi && (
            <span className={`session-check ${checked ? 'on' : ''}`} aria-hidden="true">
              {checked && <IconCheck />}
            </span>
          )}
          {!multi && session.pinned && (
            <span className="pin-dot">
              <IconPin />
            </span>
          )}
          <span className="title">{session.title}</span>
          {!multi && (
            <span className="row-actions" onClick={(e) => e.stopPropagation()}>
              <button
                ref={menuAnchor}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="icon-btn"
                title="更多"
                aria-label="更多"
                onClick={() => controller.toggleMenu(session.id)}
              >
                <IconMore width={18} height={18} />
              </button>
            </span>
          )}
        </>
      )}

      {menuOpen && (
        <SessionMenu
          anchor={menuAnchor}
          pinned={session.pinned}
          onRename={() => controller.startRename(session.id, session.title)}
          onTogglePin={() => controller.togglePin(session.id)}
          onMultiSelect={() => controller.enterMulti(session.id)}
          onDelete={() => controller.requestDelete(session.id, session.title)}
          onShare={() => {
            controller.closeMenu();
            void copyText(sessionToMarkdown(session, session.messages.find((m) => m.model)?.model ?? '')).then(() => toast('对话内容已复制，可粘贴分享'));
          }}
          onClose={controller.closeMenu}
        />
      )}
    </div>
  );
}
