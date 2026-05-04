import { create } from 'zustand';
import { toast } from 'sonner';

export interface AuditResult {
  mobile_score?: number;
  desktop_score?: number;
  seo_score?: number;
  mobile_issues?: string[];
  pain_points?: string[];
  screenshot_url?: string;
}

interface LeadAuditState {
  unAuditedLeads: any[];
  isLoading: boolean;
  fetchUnauditedLeads: () => Promise<void>;
  
  isAuditing: boolean;
  currentAuditLeadId: string | null;
  runAudit: (leadId: string, website: string) => Promise<void>;
}

export const useLeadAuditStore = create<LeadAuditState>((set, get) => ({
  unAuditedLeads: [],
  isLoading: false,
  fetchUnauditedLeads: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/leads?status=new`);
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      set({ unAuditedLeads: data, isLoading: false });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load leads for auditing');
      set({ isLoading: false });
    }
  },

  isAuditing: false,
  currentAuditLeadId: null,
  runAudit: async (leadId, website) => {
    if (!website) {
      toast.error('Cannot audit lead without a website');
      return;
    }

    set({ isAuditing: true, currentAuditLeadId: leadId });
    try {
      const res = await fetch('/api/audit/pagespeed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, website })
      });
      if (!res.ok) throw new Error('Audit failed');
      const data = await res.json();
      toast.success('Audit completed successfully');
      
      // Remove from unaudited list
      set(state => ({
        unAuditedLeads: state.unAuditedLeads.filter(l => l.id !== leadId)
      }));
    } catch (error) {
      console.error(error);
      toast.error('Failed to run audit');
    } finally {
      set({ isAuditing: false, currentAuditLeadId: null });
    }
  }
}));
