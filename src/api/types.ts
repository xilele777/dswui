import type { Provider, ReasoningEffort, SearchStatus, Usage, WebSource } from '../types';

export interface WireMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  provider: Provider;
  model: string;
  messages: WireMessage[];
  temperature?: number;
  maxTokens?: number;
  thinking?: boolean;
  search?: boolean;
  reasoningEffort?: ReasoningEffort;
  thinkingBudget?: number;
  signal?: AbortSignal;
  onDelta: (chunk: string) => void;
  onReasoning?: (chunk: string) => void;
  onUsage?: (usage: Usage) => void;
  onModel?: (model: string) => void;
  onSources?: (sources: WebSource[]) => void;
  onSearchStatus?: (status: SearchStatus) => void;
}
