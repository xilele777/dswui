import { useComposer } from './useComposer';
import { ComposerToolbar } from './ComposerToolbar';
import { ScrollToBottomButton } from '../chat/ScrollToBottomButton';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  thinking: boolean;
  search: boolean;
  toggleThinking: () => void;
  toggleSearch: () => void;
  enterToSend: boolean;
  searchAvailable: boolean;
  onConfigureSearch: () => void;
  thinkingHint?: string;
  onScrollToBottom?: () => void;
}

export function Composer({
  onSend,
  onStop,
  streaming,
  thinking,
  search,
  toggleThinking,
  toggleSearch,
  enterToSend,
  searchAvailable,
  onConfigureSearch,
  thinkingHint,
  onScrollToBottom,
}: Props) {
  const composer = useComposer({ onSend, streaming, enterToSend });

  return (
    <div className="composer-wrap">
      <div className="composer-inner">
        {onScrollToBottom && <ScrollToBottomButton onClick={onScrollToBottom} />}
        <div className={`composer ${composer.focused ? 'focused' : ''}`}>
          <textarea
            ref={composer.taRef}
            value={composer.value}
            rows={2}
            placeholder="给 DeepSeek 发送消息"
            onChange={(e) => composer.setValue(e.target.value)}
            onFocus={() => composer.setFocused(true)}
            onBlur={() => composer.setFocused(false)}
            onKeyDown={composer.handleKeyDown}
          />
          <ComposerToolbar
            thinking={thinking}
            search={search}
            streaming={streaming}
            canSend={composer.canSend}
            searchAvailable={searchAvailable}
            onConfigureSearch={onConfigureSearch}
            thinkingHint={thinkingHint}
            toggleThinking={toggleThinking}
            toggleSearch={toggleSearch}
            onSend={composer.submit}
            onStop={onStop}
          />
        </div>
        <div className="disclaimer">内容由 AI 生成，请仔细甄别</div>
      </div>
    </div>
  );
}
