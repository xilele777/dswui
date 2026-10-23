export type Role = 'user' | 'assistant' | 'system';

export type MessageStatus = 'WIP' | 'OK' | 'INCOMPLETE' | 'ERROR';

export type ReasoningEffort = 'auto' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export type ThinkingMode = 'auto' | 'model' | 'reasoning_effort' | 'deepseek' | 'openrouter' | 'thinking_budget' | 'siliconflow' | 'custom';
export type SearchMode = 'auto' | 'none' | 'openrouter' | 'enable_search' | 'search_enabled' | 'deepseek' | 'custom';

export interface WebSource { title: string; url: string; snippet?: string; siteName?: string; publishedAt?: string; }
export type SearchStatus = 'searching' | 'complete' | 'empty' | 'unverified' | 'error';
export type ThinkingStep =
  | { type: 'reasoning'; text: string }
  | { type: 'search'; sources: WebSource[]; status: SearchStatus };

export interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface Message {
  id: string;
  role: Role;
  /** 正文（对应 DeepSeek 的 RESPONSE 片段） */
  content: string;
  /** 思维链（对应 THINK 片段） */
  reasoning?: string;
  /** 按接收顺序保存思考与搜索节点，旧记录仍可使用 reasoning。 */
  thinkingSteps?: ThinkingStep[];
  status: MessageStatus;
  createdAt: number;
  /** 思维链耗时（毫秒），用于渲染“已深度思考（用时 12 秒）” */
  reasoningMs?: number;
  model?: string;
  usage?: Usage;
  error?: string;
  /** 用户消息在发送时附带的两颗开关状态，用于回显 */
  thinkingEnabled?: boolean;
  searchEnabled?: boolean;
  reasoningEffort?: ReasoningEffort;
  thinkingBudget?: number;
  sources?: WebSource[];
  searchStatus?: SearchStatus;
  generationPhase?: 'searching' | 'thinking' | 'answering';
}

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  messages: Message[];
}

export interface Provider {
  id: string;
  name: string;
  /** 例如 https://api.deepseek.com/v1 或中转站地址 */
  baseUrl: string;
  apiKey: string;
  models: string[];
  defaultModel: string;
  /** 开启深度思考时可切换模型，参数协议单独配置。 */
  thinkingModel?: string;
  /** 兼容旧配置；新配置使用 searchMode。 */
  passSearchParam?: boolean;
  thinkingMode?: ThinkingMode;
  reasoningEffort?: ReasoningEffort;
  thinkingBudget?: number;
  searchMode?: SearchMode;
  thinkingOnParams?: string;
  thinkingOffParams?: string;
  searchParams?: string;
  headers?: Record<string, string>;
}

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  sendReasoningEffort: boolean;
  enterToSend: boolean;
  showTokenUsage: boolean;
}
