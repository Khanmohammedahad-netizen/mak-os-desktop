import { create } from 'zustand';
import { toast } from 'sonner';
import { Lead } from './leadMineStore';

export const PIPELINE_STAGES = [
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'replied', label: 'Replied', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'meeting_booked', label: 'Meeting Booked', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'closed_won', label: 'Closed Won', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { id: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

interface PipelineState {
  pipelineLeads: Lead[];
  isLoading: boolean;
  fetchPipelineLeads: () => Promise<void>;
  updateLeadStatus: (leadId: string, newStatus: string) => Promise<void>;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  pipelineLeads: [],
  isLoading: false,
  fetchPipelineLeads: async () => {
    set({ isLoading: true });
    try {
      // Fetch leads that are past the 'audited' stage
      const res = await fetch(`/api/leads`);
      if (!res.ok) throw new Error('Failed to fetch pipeline leads');
      const data = await res.json();
      
      const activePipeline = data.filter((lead: Lead) => 
        PIPELINE_STAGES.some(stage => stage.id === lead.status)
      );

      set({ pipelineLeads: activePipeline, isLoading: false });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load pipeline');
      set({ isLoading: false });
    }
  },

  updateLeadStatus: async (leadId, newStatus) => {
    // Optimistic update
    const previousLeads = get().pipelineLeads;
    set({
      pipelineLeads: previousLeads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    });

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success('Pipeline updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update lead status');
      // Revert optimistic update
      set({ pipelineLeads: previousLeads });
    }
  }
}));
