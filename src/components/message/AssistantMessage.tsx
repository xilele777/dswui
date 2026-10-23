import type { Message } from '../../types';
import { useThrottled } from '../../lib/useThrottled';
import { Markdown } from '../Markdown';
import { ThinkBlock } from './ThinkBlock';
import { AssistantActions } from './AssistantActions';
import { SearchResults } from './SearchResults';

interface Props {
  message: Message;
  showUsage: boolean;
  streaming: boolean;
  onRegenerate: (messageId: string) => void;
}

export function AssistantMessage({ message, showUsage, streaming, onRegenerate }: Props) {
  const wip = message.status === 'WIP';
  const display = useThrottled(message.content, wip ? 80 : 0);
  const hasSearch = !!message.searchStatus || !!message.sources?.length;
  const showThink = !!message.reasoning || (!!message.thinkingEnabled && wip && message.generationPhase !== 'answering');
  const thinking = wip && (message.generationPhase === 'thinking' || (!message.generationPhase && !message.content));
  const searchResults = hasSearch ? <SearchResults sources={message.sources} status={message.searchStatus} wip={wip} /> : null;
  // 旧历史没有事件顺序，保留来源入口；新消息使用实际接收的时间线。
  const steps = message.thinkingSteps?.length ? message.thinkingSteps : [
    ...(hasSearch ? [{ type: 'search' as const, sources: message.sources ?? [], status: message.searchStatus ?? 'complete' as const }] : []),
    ...(message.reasoning ? [{ type: 'reasoning' as const, text: message.reasoning }] : []),
  ];

  return (
    <div className="msg msg-ai" data-mid={message.id}>
      {showThink && (
        <ThinkBlock text={message.reasoning ?? ''} ms={message.reasoningMs} wip={thinking} searching={wip && message.searchStatus === 'searching'} steps={steps} />
      )}
      {!showThink && searchResults}

      {(display || !message.error) && (
        <div className="body">
          {display ? <Markdown text={display} /> : wip ? null : <span style={{ opacity: 0.5 }}>（无内容）</span>}
        </div>
      )}

      {message.error && (
        <div className="error-card">
          {message.error}
          <div className="err-actions">
            <button className="mini-btn" disabled={streaming} onClick={() => onRegenerate(message.id)}>
              重试
            </button>
          </div>
        </div>
      )}

      {message.status === 'INCOMPLETE' && !message.error && (
        <div style={{ fontSize: 12, color: 'var(--label-tertiary)', marginTop: 6 }}>已停止</div>
      )}

      <AssistantActions message={message} wip={wip} streaming={streaming} showUsage={showUsage} onRegenerate={onRegenerate} />
    </div>
  );
}
