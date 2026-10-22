import type { StateCreator } from 'zustand';
import type { SettingsSlice, StoreState } from '../types';
import { DEFAULT_SETTINGS } from '../defaults';

export const createSettingsSlice: StateCreator<StoreState, [], [], SettingsSlice> = (set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (patch) => set((st) => ({ settings: { ...st.settings, ...patch } })),
});
