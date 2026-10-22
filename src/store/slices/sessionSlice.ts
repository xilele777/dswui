import type { StateCreator } from 'zustand';
import type { StoreState, SessionSlice } from '../types';
import { emptySession } from '../defaults';

const now = () => Date.now();

export const createSessionSlice: StateCreator<StoreState, [], [], SessionSlice> = (set, get) => ({
  sessions: [],
  activeSessionId: null,

  newSession: () => {
    const current = get().sessions.find((s) => s.id === get().activeSessionId);
    if (current && current.messages.length === 0) return current.id;
    const s = emptySession();
    set((st) => ({ sessions: [s, ...st.sessions.filter((item) => item.messages.length > 0)], activeSessionId: s.id }));
    return s.id;
  },
  selectSession: (id) => set((st) => ({
    activeSessionId: id,
    sessions: st.sessions.filter((s) => s.id === id || s.messages.length > 0),
  })),
  deleteSession: (id) =>
    set((st) => {
      const sessions = st.sessions.filter((s) => s.id !== id);
      return {
        sessions,
        activeSessionId: st.activeSessionId === id ? sessions[0]?.id ?? null : st.activeSessionId,
      };
    }),
  renameSession: (id, title) =>
    set((st) => ({
      sessions: st.sessions.map((s) => (s.id === id ? { ...s, title } : s)),
    })),
  togglePin: (id) =>
    set((st) => ({
      sessions: st.sessions.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)),
    })),
  clearAllSessions: () => set({ sessions: [], activeSessionId: null }),
  setSessionThinking: (id, thinking) =>
    set((st) => ({
      sessions: st.sessions.map((s) =>
        s.id === id
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.role === 'assistant' ? { ...m, thinkingEnabled: thinking } : m,
              ),
            }
          : s,
      ),
    })),

  appendMessages: (sessionId, msgs) =>
    set((st) => ({
      sessions: st.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: [...s.messages, ...msgs],
              updatedAt: now(),
              title:
                s.title === '新对话'
                  ? msgs.find((m) => m.role === 'user')?.content.slice(0, 40).trim() || s.title
                  : s.title,
            }
          : s,
      ),
    })),
  patchMessage: (sessionId, messageId, patch) =>
    set((st) => ({
      sessions: st.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              updatedAt: now(),
              messages: s.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
            }
          : s,
      ),
    })),
  removeFromMessage: (sessionId, messageId, inclusive = true) =>
    set((st) => ({
      sessions: st.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const idx = s.messages.findIndex((m) => m.id === messageId);
        if (idx < 0) return s;
        return { ...s, messages: s.messages.slice(0, inclusive ? idx : idx + 1) };
      }),
    })),
  truncateAfter: (sessionId, messageId) =>
    set((st) => ({
      sessions: st.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const idx = s.messages.findIndex((m) => m.id === messageId);
        if (idx < 0) return s;
        return { ...s, messages: s.messages.slice(0, idx + 1) };
      }),
    })),
});
