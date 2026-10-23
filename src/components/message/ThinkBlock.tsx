import { useId, useState } from 'react';
import type { ThinkingStep } from '../../types';
import { useThrottled } from '../../lib/useThrottled';
import { Markdown } from '../Markdown';
import { IconChevronDown, IconThinking } from '../Icons';
import { SearchResults } from './SearchResults';

interface Props {
  text: string;
  ms?: number;
  wip: boolean;
  searching?: boolean;
  steps?: ThinkingStep[];
}

function ReasoningStep({ text, active }: { text: string; active: boolean }) {
  const body = useThrottled(text, active ? 90 : 0);
  return <div className="think-body">
    <span className={`think-progress ${active ? '' : 'inactive'}`} aria-hidden="true"><i /></span>
    <Markdown text={body} className="md-muted" />
  </div>;
}

export function ThinkBlock({ text, ms, wip, searching, steps }: Props) {
  const [open, setOpen] = useState(true);
  const bodyId = useId();

  const seconds = ms ? Math.max(1, Math.round(ms / 1000)) : 0;
  const label = searching && !text ? '搜索中...' : wip ? '正在思考' : seconds ? `已思考（用时 ${seconds} 秒）` : text ? '已思考' : '已停止';
  const timeline = steps?.length ? steps : text ? [{ type: 'reasoning' as const, text }] : [];

  return (
    <div className={`think ${open ? 'open' : ''} ${wip ? 'thinking' : ''}`}>
      <button className="think-head" type="button" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen((v) => !v)}>
        <IconThinking className="think-icon" />
        <span className="think-label">{label}</span>
        <span className="caret"><IconChevronDown /></span>
      </button>
      {open && (
        <div className="think-timeline" id={bodyId}>
          {timeline.map((step, index) => step.type === 'search'
            ? <SearchResults key={index} sources={step.sources} status={step.status} wip={!!searching} />
            : <ReasoningStep key={index} text={step.text} active={wip && index === timeline.length - 1} />)}
          {!timeline.length && wip && <ReasoningStep text="" active />}
        </div>
      )}
    </div>
  );
}
