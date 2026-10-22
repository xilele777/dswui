import type { Message, Provider, Session, Settings } from '../types';

export interface SessionSlice {
  sessions: Session[];
  activeSessionId: string | null;

  newSession: () => string;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  clearAllSessions: () => void;
  setSessionThinking: (id: string, thinking: boolean) => void;

  appendMessages: (sessionId: string, msgs: Message[]) => void;
  patchMessage: (sessionId: string, messageId: string, patch: Partial<Message>) => void;
  removeFromMessage: (sessionId: string, messageId: string, inclusive?: boolean) => void;
  truncateAfter: (sessionId: string, messageId: string) => void;
}

export interface ProviderSlice {
  providers: Provider[];
  activeProviderId: string;

  addProvider: () => string;
  updateProvider: (id: string, patch: Partial<Provider>) => void;
  removeProvider: (id: string) => void;
  setActiveProvider: (id: string) => void;
}

export interface SettingsSlice {
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
}

export interface UiSlice {
  sidebarOpen: boolean;
  /** 正在流式输出的消息：`${sessionId}:${messageId}` */
  streamingKey: string | null;

  setSidebarOpen: (open: boolean) => void;
  setStreamingKey: (key: string | null) => void;
}

export type StoreState = SessionSlice & ProviderSlice & SettingsSlice & UiSlice;
