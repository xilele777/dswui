import { useMemo, useState } from 'react';
import type { Message } from '../../types';
import { copyText } from '../../lib/clipboard';
import { toast } from '../Toast';
import { IconCopy, IconDislike, IconLike, IconRefresh, IconSpeaker, IconShare } from '../Icons';

interface Props {
  message: Message;
  wip: boolean;
  streaming: boolean;
  showUsage: boolean;
  onRegenerate: (messageId: string) => void;
}

export function AssistantActions({ message, wip, streaming, showUsage, onRegenerate }: Props) {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  const usageText = useMemo(() => {
    if (!message.usage) return '';
    const { prompt_tokens, completion_tokens, total_tokens } = message.usage;
    const parts: string[] = [];
    if (prompt_tokens != null) parts.push(`输入 ${prompt_tokens}`);
    if (completion_tokens != null) parts.push(`输出 ${completion_tokens}`);
    if (!parts.length && total_tokens != null) parts.push(`共 ${total_tokens}`);
    return parts.join(' · ') + ' tokens';
  }, [message.usage]);

  const copy = () => {
    void copyText(message.content).then(() => toast('已复制'));
  };

  const vote = (next: 'like' | 'dislike') => {
    setFeedback(feedback === next ? null : next);
    toast(feedback === next ? '已取消' : '感谢反馈');
  };

  const readAloud = () => {
    if (!('speechSynthesis' in window)) { toast('当前浏览器不支持朗读'); return; }
    if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); return; }
    const speech = new SpeechSynthesisUtterance(message.content);
    speech.lang = 'zh-CN';
    window.speechSynthesis.speak(speech);
  };

  if (wip) return null;

  return (
    <div className="msg-actions assistant-actions">
      {message.content && (
        <button className="icon-btn" title="复制" onClick={copy}>
          <IconCopy />
        </button>
      )}
      <button className="icon-btn" title="重新生成" disabled={streaming} onClick={() => onRegenerate(message.id)}>
        <IconRefresh />
      </button>
      <button
        className={`icon-btn ${feedback === 'like' ? 'active' : ''}`}
        title="有帮助"
        onClick={() => vote('like')}
      >
        <IconLike />
      </button>
      <button
        className={`icon-btn ${feedback === 'dislike' ? 'active' : ''}`}
        title="没帮助"
        onClick={() => vote('dislike')}
      >
        <IconDislike />
      </button>
      <button className="icon-btn" title="朗读" aria-label="朗读" onClick={readAloud}><IconSpeaker /></button>
      <button className="icon-btn" title="分享" aria-label="分享" onClick={() => void copyText(message.content).then(() => toast('回答内容已复制，可粘贴分享'))}><IconShare /></button>
      {showUsage && usageText && <span className="msg-meta">{usageText}</span>}
    </div>
  );
}
