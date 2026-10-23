import { activeProvider, useStore } from '../store';
import { effectiveEffort } from '../api/capabilities';
import { uid } from '../lib/id';
import type { Message } from '../types';
import { hasActiveGeneration, stopAllGenerations } from './controllers';
import { runGeneration } from './generation';

export function stopGeneration(sessionId?: string): void {
  stopAllGenerations(sessionId);
}

export function isStreaming(): boolean {
  return hasActiveGeneration();
}

function blankAssistant(patch: Partial<Message> = {}): Message {
  return {
    id: uid(),
    role: 'assistant',
    content: '',
    status: 'WIP',
    createdAt: Date.now(),
    ...patch,
  };
}

/** 发送一条用户消息。 */
export async function sendMessage(text: string, opts: { thinking: boolean; search: boolean }) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const st = useStore.getState();
  const provider = activeProvider(st);
  let sessionId = st.activeSessionId;
  if (!sessionId || !st.sessions.some((s) => s.id === sessionId)) {
    sessionId = st.newSession();
  }
  if (st.sessions.find((s) => s.id === sessionId)?.messages.some((m) => m.status === 'WIP')) return;

  const userMsg: Message = {
    id: uid(),
    role: 'user',
    content: trimmed,
    status: 'OK',
    createdAt: Date.now(),
    thinkingEnabled: opts.thinking,
    searchEnabled: opts.search,
    reasoningEffort: effectiveEffort(provider),
    thinkingBudget: provider.thinkingBudget,
  };
  const ai = blankAssistant({ thinkingEnabled: opts.thinking, searchEnabled: opts.search });

  useStore.getState().appendMessages(sessionId, [userMsg, ai]);
  await runGeneration(sessionId, ai.id);
}

/** 重新生成某条 assistant 消息。 */
export async function regenerate(sessionId: string, assistantId: string) {
  const st = useStore.getState();
  const session = st.sessions.find((s) => s.id === sessionId);
  if (!session) return;
  if (session.messages.some((m) => m.status === 'WIP')) return;
  const idx = session.messages.findIndex((m) => m.id === assistantId);
  if (idx < 0) return;
  const prevUser = [...session.messages.slice(0, idx)].reverse().find((m) => m.role === 'user');
  const ai = blankAssistant({
    thinkingEnabled: prevUser?.thinkingEnabled,
    searchEnabled: prevUser?.searchEnabled,
  });
  useStore.getState().truncateAfter(sessionId, idx > 0 ? session.messages[idx - 1].id : assistantId);
  // truncateAfter 已把目标消息之后（含）截断，这里补上新的占位
  useStore.getState().appendMessages(sessionId, [ai]);
  await runGeneration(sessionId, ai.id);
}

/** 编辑用户消息并重新发送。 */
export async function editAndResend(sessionId: string, userId: string, text: string) {
  const next = text.trim();
  if (!next) return;
  const st = useStore.getState();
  const session = st.sessions.find((s) => s.id === sessionId);
  if (!session) return;
  if (session.messages.some((m) => m.status === 'WIP')) return;
  const target = session.messages.find((m) => m.id === userId);
  if (!target) return;
  useStore.getState().patchMessage(sessionId, userId, { content: next });
  useStore.getState().truncateAfter(sessionId, userId);
  const ai = blankAssistant({
    thinkingEnabled: target.thinkingEnabled,
    searchEnabled: target.searchEnabled,
  });
  useStore.getState().appendMessages(sessionId, [ai]);
  await runGeneration(sessionId, ai.id);
}

/** 从某条消息起截断（用于“删除这条及之后”）。 */
export function deleteFrom(sessionId: string, messageId: string, inclusive = true) {
  useStore.getState().removeFromMessage(sessionId, messageId, inclusive);
}
