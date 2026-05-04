import { create } from 'zustand';
import { toast } from 'sonner';

export interface Lead {
  id: string;
  business_name: string;
  category: string;
  niche: string;
  country: string;
  city: string;
  area: string;
  phone_normalized: string;
  whatsapp_registered: boolean;
  email: string;
  website: string;
  google_rating: number;
  google_reviews_count: number;
  lead_score: number;
  status: string;
  audit_completed: boolean;
}

interface LeadMineState {
  leads: Lead[];
  isLoading: boolean;
  fetchLeads: (filters?: Record<string, string>) => Promise<void>;
  
  selectedLeads: string[];
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  isScraping: boolean;
  scrapeProgress: string;
  runApifyScrape: (query: string, maxResults: number) => Promise<void>;
  runCompaniesHouseScrape: (query: string, date: string) => Promise<void>;
  
  addManualLead: (lead: Partial<Lead>) => Promise<void>;
  importCSV: (file: File) => Promise<void>;
}

export const useLeadMineStore = create<LeadMineState>((set, get) => ({
  leads: [],
  isLoading: false,
  fetchLeads: async (filters) => {
    set({ isLoading: true });
    try {
      const qs = new URLSearchParams(filters || {}).toString();
      const res = await fetch(`/api/leads?${qs}`);
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      set({ leads: data, isLoading: false });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load leads');
      set({ isLoading: false });
    }
  },

  selectedLeads: [],
  toggleSelection: (id) => set((state) => ({
    selectedLeads: state.selectedLeads.includes(id)
      ? state.selectedLeads.filter(x => x !== id)
      : [...state.selectedLeads, id]
  })),
  selectAll: () => set((state) => ({ selectedLeads: state.leads.map(l => l.id) })),
  clearSelection: () => set({ selectedLeads: [] }),

  isScraping: false,
  scrapeProgress: '',
  runApifyScrape: async (query, maxResults) => {
    set({ isScraping: true, scrapeProgress: 'Starting Apify scrape...' });
    try {
      const res = await fetch('/api/scrape/apify-gmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults })
      });
      if (!res.ok) throw new Error('Scrape failed');
      const data = await res.json();
      toast.success(`Scraped ${data.imported_count} new leads`);
      await get().fetchLeads();
    } catch (error) {
      console.error(error);
      toast.error('Failed to run scrape');
    } finally {
      set({ isScraping: false, scrapeProgress: '' });
    }
  },
  runCompaniesHouseScrape: async (query, date) => {
    set({ isScraping: true, scrapeProgress: 'Searching Companies House...' });
    try {
      const res = await fetch('/api/scrape/uk-companies-house', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, incorporatedAfter: date })
      });
      if (!res.ok) throw new Error('Scrape failed');
      const data = await res.json();
      toast.success(`Imported ${data.imported_count} companies`);
      await get().fetchLeads();
    } catch (error) {
      console.error(error);
      toast.error('Failed to run search');
    } finally {
      set({ isScraping: false, scrapeProgress: '' });
    }
  },

  addManualLead: async (lead) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (!res.ok) throw new Error('Failed to add lead');
      toast.success('Lead added');
      await get().fetchLeads();
    } catch (error) {
      console.error(error);
      toast.error('Failed to add lead');
    }
  },
  
  importCSV: async (file) => {
    // Placeholder for CSV import logic
    toast.success('CSV import not fully implemented yet');
  }
}));
