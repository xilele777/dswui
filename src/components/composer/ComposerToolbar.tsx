import { toast } from '../Toast';
import { IconArrowUp, IconPaperclip, IconStop } from '../Icons';
import { AnimatedToggleIcon } from './AnimatedToggleIcon';
import { activeProvider, useStore } from '../../store';
import { effectiveEffort, effortOptions, EFFORT_LABELS } from '../../api/capabilities';
import type { ReasoningEffort } from '../../types';
import { Select } from '../ui/Select';

interface Props {
  thinking: boolean;
  search: boolean;
  streaming: boolean;
  canSend: boolean;
  searchAvailable: boolean;
  onConfigureSearch: () => void;
  thinkingHint?: string;
  toggleThinking: () => void;
  toggleSearch: () => void;
  onSend: () => void;
  onStop: () => void;
}

export function ComposerToolbar({
  thinking,
  search,
  streaming,
  canSend,
  searchAvailable,
  onConfigureSearch,
  thinkingHint,
  toggleThinking,
  toggleSearch,
  onSend,
  onStop,
}: Props) {
  const provider = useStore(activeProvider);
  const updateProvider = useStore((s) => s.updateProvider);
  const efforts = effortOptions(provider);
  const toggleSearchChecked = () => {
    if (!searchAvailable && !search) {
      toast('请选择中转实际支持的联网搜索协议');
      onConfigureSearch();
      return;
    }
    toggleSearch();
  };

  return (
    <div className="composer-bar">
      <button
        className={`pill ${thinking ? 'on' : ''}`}
        aria-pressed={thinking}
        onClick={toggleThinking}
        title={thinkingHint || '让模型先思考再回答，需要服务商支持推理模型'}
      >
        <AnimatedToggleIcon kind="thinking" enabled={thinking} />
        深度思考
      </button>
      <button
        className={`pill ${search ? 'on' : ''}`}
        aria-pressed={search}
        onClick={toggleSearchChecked}
        title={searchAvailable ? '使用已配置的联网搜索协议' : '配置联网搜索协议'}
      >
        <AnimatedToggleIcon kind="search" enabled={search} />
        智能搜索
      </button>
      {thinking && efforts.length > 0 && <Select label="思考强度" className="composer-effort" value={effectiveEffort(provider)}
        options={efforts.map((value) => ({ value, label: EFFORT_LABELS[value] }))}
        onChange={(value) => updateProvider(provider.id, { reasoningEffort: value as ReasoningEffort })} />}
      <div className="spacer" />
      <button
        className="composer-attach"
        title="添加附件"
        aria-label="添加附件"
        onClick={() => toast('附件能力将在文件解析接入后启用')}
      >
        <IconPaperclip />
      </button>
      {streaming ? (
        <button className="send-btn stop" onClick={onStop} title="停止生成">
          <IconStop />
        </button>
      ) : (
        <button className="send-btn" disabled={!canSend} onClick={onSend} title="发送">
          <IconArrowUp />
        </button>
      )}
    </div>
  );
}
