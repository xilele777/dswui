import type { Provider, Session, Settings } from '../types';
import { uid } from '../lib/id';

export const DEFAULT_PROVIDER: Provider = {
  id: 'p-default',
  name: 'DeepSeek 官方',
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  models: ['deepseek-chat', 'deepseek-reasoner'],
  defaultModel: 'deepseek-chat',
  thinkingModel: 'deepseek-reasoner',
  passSearchParam: false,
};

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  temperature: 1,
  maxTokens: 8192,
  systemPrompt: '',
  sendReasoningEffort: false,
  enterToSend: true,
  showTokenUsage: true,
};

export const emptySession = (): Session => ({
  id: uid(),
  title: '新对话',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
});
