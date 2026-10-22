import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StoreState } from './types';
import { DEFAULT_SETTINGS } from './defaults';
import { createSessionSlice } from './slices/sessionSlice';
import { createProviderSlice } from './slices/providerSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createUiSlice } from './slices/uiSlice';

export type { StoreState, SessionSlice, ProviderSlice, SettingsSlice, UiSlice } from './types';
export { DEFAULT_PROVIDER, DEFAULT_SETTINGS } from './defaults';
export { activeProvider, activeSession, getModelFor } from './selectors';
export { uid } from '../lib/id';

export const useStore = create<StoreState>()(
  persist(
    (...args) => ({
      ...createSessionSlice(...args),
      ...createProviderSlice(...args),
      ...createSettingsSlice(...args),
      ...createUiSlice(...args),
    }),
    {
      name: 'dswui.store.v1',
      partialize: (st) =>
        ({
          sessions: st.sessions.filter((s) => s.messages.length > 0),
          activeSessionId: st.sessions.some((s) => s.id === st.activeSessionId && s.messages.length > 0) ? st.activeSessionId : null,
          providers: st.providers,
          activeProviderId: st.activeProviderId,
          settings: st.settings,
        }) as unknown as StoreState,
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<StoreState>;
        return {
          ...current,
          ...p,
          sessions: (p.sessions ?? current.sessions).filter((s) => s.messages.length > 0),
          activeSessionId: p.sessions?.some((s) => s.id === p.activeSessionId && s.messages.length > 0) ? p.activeSessionId! : null,
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
          providers: p.providers?.length ? p.providers : current.providers,
          sidebarOpen: true,
          streamingKey: null,
        };
      },
    },
  ),
);
