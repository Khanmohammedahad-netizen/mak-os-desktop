import { create } from 'zustand';
import { toast } from 'sonner';

export interface OutreachMessage {
  id: string;
  lead_id: string;
  template_id: string | null;
  channel: string;
  content: string;
  status: string;
}

interface OutreachState {
  auditedLeads: any[];
  isLoading: boolean;
  fetchAuditedLeads: () => Promise<void>;
  
  isGenerating: boolean;
  currentMessage: string;
  generateMessage: (leadId: string) => Promise<void>;
  
  isSending: boolean;
  sendMessage: (leadId: string, channel: string, content: string) => Promise<void>;
}

export const useOutreachStore = create<OutreachState>((set, get) => ({
  auditedLeads: [],
  isLoading: false,
  fetchAuditedLeads: async () => {
    set({ isLoading: true });
    try {
      // Fetch leads that are audited but not yet contacted
      const res = await fetch(`/api/leads?status=audited`);
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      set({ auditedLeads: data, isLoading: false });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load audited leads');
      set({ isLoading: false });
    }
  },

  isGenerating: false,
  currentMessage: '',
  generateMessage: async (leadId) => {
    set({ isGenerating: true, currentMessage: '' });
    try {
      const res = await fetch('/api/outreach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      set({ currentMessage: data.message });
      toast.success('Message generated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate message');
    } finally {
      set({ isGenerating: false });
    }
  },

  isSending: false,
  sendMessage: async (leadId, channel, content) => {
    set({ isSending: true });
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, channel, content })
      });
      if (!res.ok) throw new Error('Failed to send');
      
      toast.success(`${channel} message sent successfully`);
      
      // Update state
      set(state => ({
        auditedLeads: state.auditedLeads.filter(l => l.id !== leadId),
        currentMessage: ''
      }));
    } catch (error) {
      console.error(error);
      toast.error('Failed to send message');
    } finally {
      set({ isSending: false });
    }
  }
}));
