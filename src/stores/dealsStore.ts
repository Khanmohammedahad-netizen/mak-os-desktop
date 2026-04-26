import { create } from 'zustand';
import { Deal } from '@/types';

interface DealsStore {
  deals: Deal[];
  loading: boolean;
  
  setDeals: (deals: Deal[]) => void;
  setLoading: (loading: boolean) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
}

export const useDealsStore = create<DealsStore>((set) => ({
  deals: [],
  loading: false,

  setDeals: (deals) => set({ deals }),
  setLoading: (loading) => set({ loading }),
  
  addDeal: (deal) => set((state) => ({
    deals: [deal, ...state.deals]
  })),

  updateDeal: (id, updates) => set((state) => ({
    deals: state.deals.map((d) => 
      d.id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d
    )
  })),
}));
