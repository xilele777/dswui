import { streamChat } from '../api';
import { activeProvider, getModelFor, useStore } from '../store';
import type { Message } from '../types';
import { buildHistory } from './history';
import { registerController, releaseController } from './controllers';
import { StreamBuffer } from './streamBuffer';

/** 核心：为指定的 assistant 占位消息跑一次流式生成。 */
export async function runGeneration(sessionId: string, assistantId: string): Promise<void> {
  const st = useStore.getState();
  const session = st.sessions.find((s) => s.id === sessionId);
  if (!session) return;
  const idx = session.messages.findIndex((m) => m.id === assistantId);
  if (idx < 0) return;

  const provider = activeProvider(st);
  const history = session.messages.slice(0, idx);
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const thinking = !!lastUser?.thinkingEnabled;
  const search = !!lastUser?.searchEnabled;
  const model = getModelFor(provider, thinking);

  const patch = (next: Partial<Message>) => useStore.getState().patchMessage(sessionId, assistantId, next);

  if (!provider.apiKey) {
    patch({
      status: 'ERROR',
      error: '还没有填写 API Key。\n点击左下角「设置 → 服务商」，填入你自己的 Key（或中转站 Key）后即可开始对话。',
    });
    return;
  }

  const wire = buildHistory({ messages: history }, st.settings);
  if (!wire.some((m) => m.role === 'user')) return;

  const controller = registerController(assistantId);
  useStore.getState().setStreamingKey(`${sessionId}:${assistantId}`);

  const buffer = new StreamBuffer(model, patch);

  try {
    await streamChat({
      provider,
      model,
      messages: wire,
      temperature: st.settings.temperature,
      maxTokens: st.settings.maxTokens,
      thinking,
      search,
      reasoningEffort: lastUser?.reasoningEffort,
      thinkingBudget: lastUser?.thinkingBudget,
      signal: controller.signal,
      onModel: (m) => buffer.setModel(m),
      onUsage: (u) => buffer.setUsage(u),
      onReasoning: (chunk) => buffer.addReasoning(chunk),
      onDelta: (chunk) => buffer.addContent(chunk),
      onSearchStatus: (searchStatus) => buffer.setSearchStatus(searchStatus),
      onSources: (sources) => buffer.addSources(sources),
    });

    buffer.finish(buffer.hasContent ? 'OK' : 'INCOMPLETE');
  } catch (e: any) {
    const aborted = e?.name === 'AbortError';
    buffer.finish(buffer.hasContent ? 'INCOMPLETE' : 'ERROR', {
      error: aborted ? undefined : String(e?.message ?? e),
    });
  } finally {
    const message = useStore.getState().sessions.find((s) => s.id === sessionId)?.messages.find((m) => m.id === assistantId);
    if (message?.searchStatus === 'searching') patch({ searchStatus: undefined });
    releaseController(assistantId);
    const cur = useStore.getState().streamingKey;
    if (cur === `${sessionId}:${assistantId}`) useStore.getState().setStreamingKey(null);
  }
}
