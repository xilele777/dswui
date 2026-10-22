import { useId, useState } from 'react';
import { useThrottled } from '../../lib/useThrottled';
import { Markdown } from '../Markdown';
import { IconChevronDown, IconThinking } from '../Icons';

interface Props {
  text: string;
  ms?: number;
  wip: boolean;
}

export function ThinkBlock({ text, ms, wip }: Props) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();

  const seconds = ms ? Math.max(1, Math.round(ms / 1000)) : 0;
  const label = wip ? '正在思考' : seconds ? `已思考（用时 ${seconds} 秒）` : text ? '已思考' : '已停止';
  const body = useThrottled(text, wip ? 90 : 0);

  return (
    <div className={`think ${open ? 'open' : ''} ${wip ? 'thinking' : ''}`}>
      <button className="think-head" type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((v) => !v)}>
        <IconThinking className="think-icon" />
        <span className="think-label">{label}</span>
        <span className="caret"><IconChevronDown /></span>
      </button>
      {open && (
        <div className="think-body" id={bodyId}>
          <span className={`think-progress ${wip ? '' : 'inactive'}`} aria-hidden="true"><i /></span>
          <Markdown text={body} className="md-muted" />
        </div>
      )}
    </div>
  );
}
