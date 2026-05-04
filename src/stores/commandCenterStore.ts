import { create } from 'zustand';
import { toast } from 'sonner';

export interface DailyMetric {
  id: string;
  date: string;
  leads_scraped: number;
  leads_audited: number;
  emails_sent: number;
  whatsapp_sent: number;
  calls_made: number;
  replies_received: number;
  meetings_booked: number;
}

interface CommandCenterState {
  metrics: DailyMetric[];
  isLoading: boolean;
  fetchMetrics: (days?: number) => Promise<void>;
}

export const useCommandCenterStore = create<CommandCenterState>((set) => ({
  metrics: [],
  isLoading: false,
  fetchMetrics: async (days = 30) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/metrics?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data = await res.json();
      set({ metrics: data, isLoading: false });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard metrics');
      set({ isLoading: false });
    }
  }
}));
