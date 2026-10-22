import { useEffect, useRef, useState } from 'react';
import type { Message } from '../../types';
import { copyText } from '../../lib/clipboard';
import { toast } from '../Toast';
import { IconCopy, IconEdit } from '../Icons';

interface Props {
  message: Message;
  streaming: boolean;
  onEdit: (messageId: string, text: string) => void;
}

export function UserMessage({ message, streaming, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    ta.selectionStart = ta.value.length;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [editing]);

  const cancel = () => {
    setEditing(false);
    setDraft(message.content);
  };

  const submit = () => {
    setEditing(false);
    onEdit(message.id, draft);
  };

  return (
    <div className="msg msg-user" data-mid={message.id}>
      {editing ? (
        <div className="bubble bubble-editing">
          <textarea
            ref={taRef}
            value={draft}
            rows={1}
            onChange={(e) => {
              setDraft(e.target.value);
              const ta = e.target;
              ta.style.height = 'auto';
              ta.style.height = `${ta.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
              if (e.key === 'Escape') cancel();
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button className="mini-btn" onClick={cancel}>
              取消
            </button>
            <button
              className="mini-btn"
              style={{ background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }}
              onClick={submit}
            >
              发送
            </button>
          </div>
        </div>
      ) : (
        <div className="bubble">{message.content}</div>
      )}

      {!editing && (
        <div className="msg-actions">
          <button
            className="icon-btn"
            title="复制"
            onClick={() => void copyText(message.content).then(() => toast('已复制'))}
          >
            <IconCopy />
          </button>
          {!streaming && (
            <button
              className="icon-btn"
              title="修改"
              onClick={() => {
                setDraft(message.content);
                setEditing(true);
              }}
            >
              <IconEdit />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
