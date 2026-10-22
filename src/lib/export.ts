import type { Session } from '../types';
import { formatTime } from './format';

export function sessionToMarkdown(s: Session, modelLabel: string): string {
  const lines = [`# ${s.title}`, '', `> 模型：${modelLabel}　导出于 ${formatTime(Date.now())}`, ''];
  for (const m of s.messages) {
    if (m.role === 'user') {
      lines.push('## 👤 我', '', m.content, '');
    } else if (m.role === 'assistant') {
      lines.push('## 🤖 助手', '');
      if (m.reasoning) lines.push('<details><summary>深度思考</summary>', '', m.reasoning, '', '</details>', '');
      lines.push(m.content || '（空）', '');
      if (m.sources?.length) lines.push('### 网页来源', '', ...m.sources.map((source) => `- [${source.title.replace(/[\[\]\\]/g, '')}](${source.url.replace(/\)/g, '%29')})`), '');
    }
  }
  return lines.join('\n');
}
