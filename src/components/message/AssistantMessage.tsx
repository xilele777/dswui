import type { Message } from '../../types';
import { useThrottled } from '../../lib/useThrottled';
import { Markdown } from '../Markdown';
import { ThinkBlock } from './ThinkBlock';
import { AssistantActions } from './AssistantActions';

interface Props {
  message: Message;
  showUsage: boolean;
  onRegenerate: (messageId: string) => void;
}

export function AssistantMessage({ message, showUsage, onRegenerate }: Props) {
  const wip = message.status === 'WIP';
  const display = useThrottled(message.content, wip ? 80 : 0);
  const showThink = !!message.reasoning || (!!message.thinkingEnabled && wip && !message.content);

  return (
    <div className="msg msg-ai" data-mid={message.id}>
      {showThink && (
        <ThinkBlock text={message.reasoning ?? ''} ms={message.reasoningMs} wip={wip && !message.content} />
      )}

      {message.error ? (
        <div className="error-card">
          {message.error}
          <div className="err-actions">
            <button className="mini-btn" onClick={() => onRegenerate(message.id)}>
              重试
            </button>
          </div>
        </div>
      ) : (
        <div className="body">
          {display ? (
            <Markdown text={display} />
          ) : wip ? null : (
            <span style={{ opacity: 0.5 }}>（无内容）</span>
          )}
        </div>
      )}

      {message.status === 'INCOMPLETE' && !message.error && (
        <div style={{ fontSize: 12, color: 'var(--label-tertiary)', marginTop: 6 }}>已停止</div>
      )}

      {!!message.sources?.length && <details className="message-sources"><summary>{message.sources.length} 个网页</summary>
        {message.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}
      </details>}

      <AssistantActions message={message} wip={wip} showUsage={showUsage} onRegenerate={onRegenerate} />
    </div>
  );
}
