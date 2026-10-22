import type { WireMessage } from '../api';
import type { Session, Settings } from '../types';

/** 把本地消息树拍平成 OpenAI 兼容的 messages 数组。 */
export function buildHistory(
  session: Pick<Session, 'messages'>,
  settings: Pick<Settings, 'systemPrompt'>,
): WireMessage[] {
  const out: WireMessage[] = [];
  if (settings.systemPrompt.trim()) {
    out.push({ role: 'system', content: settings.systemPrompt.trim() });
  }
  for (const m of session.messages) {
    if (m.role === 'system') continue;
    if (m.status === 'ERROR') continue;
    if (m.role === 'assistant' && !m.content.trim()) continue;
    out.push({ role: m.role, content: m.content });
  }
  return out;
}
