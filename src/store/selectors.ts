import type { Provider, Session } from '../types';
import type { StoreState } from './types';

export const activeProvider = (st: StoreState): Provider =>
  st.providers.find((p) => p.id === st.activeProviderId) ?? st.providers[0];

export const activeSession = (st: StoreState): Session | undefined =>
  st.sessions.find((s) => s.id === st.activeSessionId);

export function getModelFor(provider: Provider, thinking: boolean): string {
  if (thinking && provider.thinkingModel) return provider.thinkingModel;
  return provider.defaultModel || provider.models[0] || 'deepseek-chat';
}
