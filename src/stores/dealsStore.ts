import { create } from 'zustand';
import { Deal } from '@/types';

interface DealsStore {
  deals: Deal[];
  loading: boolean;
  activeDealId: string | null;

  setDeals: (deals: Deal[]) => void;
  setLoading: (loading: boolean) => void;
  setActiveDealId: (id: string | null) => void;
  fetchDeals: () => Promise<void>;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  updateDealStage: (id: string, stage: string) => void;
  removeDeal: (id: string) => void;
}

export const useDealsStore = create<DealsStore>((set) => ({
  deals: [],
  loading: false,
  activeDealId: null,

  setDeals: (deals) => set({ deals }),
  setLoading: (loading) => set({ loading }),
  setActiveDealId: (activeDealId) => set({ activeDealId }),

  fetchDeals: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/deals');
      const data: unknown = await res.json();
      set({ deals: Array.isArray(data) ? (data as Deal[]) : [] });
    } catch (err) {
      console.error('[dealsStore] fetchDeals failed:', err);
    } finally {
      set({ loading: false });
    }
  },

  addDeal: (deal) => set((state) => ({
    deals: [deal, ...state.deals],
  })),

  updateDeal: (id, updates) => set((state) => ({
    deals: state.deals.map((d) =>
      d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d
    ),
  })),

  updateDealStage: (id, stage) => set((state) => ({
    deals: state.deals.map((d) =>
      d.id === id ? { ...d, stage, updated_at: new Date().toISOString() } : d
    ),
  })),

  removeDeal: (id) => set((state) => ({
    deals: state.deals.filter((d) => d.id !== id),
    activeDealId: state.activeDealId === id ? null : state.activeDealId,
  })),
}));
