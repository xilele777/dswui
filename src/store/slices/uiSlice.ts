import type { StateCreator } from 'zustand';
import type { StoreState, UiSlice } from '../types';

export const createUiSlice: StateCreator<StoreState, [], [], UiSlice> = (set) => ({
  sidebarOpen: true,
  streamingKey: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setStreamingKey: (key) => set({ streamingKey: key }),
});
