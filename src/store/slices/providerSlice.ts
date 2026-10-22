import type { StateCreator } from 'zustand';
import type { Provider } from '../../types';
import type { ProviderSlice, StoreState } from '../types';
import { DEFAULT_PROVIDER } from '../defaults';
import { uid } from '../../lib/id';

export const createProviderSlice: StateCreator<StoreState, [], [], ProviderSlice> = (set) => ({
  providers: [DEFAULT_PROVIDER],
  activeProviderId: DEFAULT_PROVIDER.id,

  addProvider: () => {
    const p: Provider = {
      id: uid(),
      name: '新服务商',
      baseUrl: '',
      apiKey: '',
      models: [],
      defaultModel: '',
    };
    set((st) => ({ providers: [...st.providers, p], activeProviderId: p.id }));
    return p.id;
  },
  updateProvider: (id, patch) =>
    set((st) => ({
      providers: st.providers.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
  removeProvider: (id) =>
    set((st) => {
      const providers = st.providers.filter((p) => p.id !== id);
      return {
        providers: providers.length ? providers : [DEFAULT_PROVIDER],
        activeProviderId:
          st.activeProviderId === id ? (providers[0]?.id ?? DEFAULT_PROVIDER.id) : st.activeProviderId,
      };
    }),
  setActiveProvider: (id) => set({ activeProviderId: id }),
});
