import { create } from 'zustand';
import { toast } from 'sonner';

export type SettingsSection = 'api_keys' | 'templates' | 'niche' | 'follow_up' | 'identity';

export interface OutreachTemplate {
  id: string;
  name: string;
  channel: string;
  niche: string;
  subject_template: string | null;
  body_template: string;
  times_used: number;
  reply_count: number;
  reply_rate: number;
  is_active: boolean;
}

interface SettingsState {
  activeSection: SettingsSection;
  setActiveSection: (section: SettingsSection) => void;
  
  apiKeys: Record<string, string>;
  isLoadingKeys: boolean;
  fetchApiKeys: () => Promise<void>;
  updateApiKey: (key: string, value: string) => Promise<void>;

  templates: OutreachTemplate[];
  isLoadingTemplates: boolean;
  fetchTemplates: () => Promise<void>;
  createTemplate: (template: Partial<OutreachTemplate>) => Promise<void>;
  updateTemplate: (id: string, updates: Partial<OutreachTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  activeSection: 'api_keys',
  setActiveSection: (section) => set({ activeSection: section }),

  apiKeys: {},
  isLoadingKeys: false,
  fetchApiKeys: async () => {
    set({ isLoadingKeys: true });
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      set({ apiKeys: data, isLoadingKeys: false });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load API keys');
      set({ isLoadingKeys: false });
    }
  },
  updateApiKey: async (key: string, value: string) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error('Failed to update setting');
      set((state) => ({ apiKeys: { ...state.apiKeys, [key]: value } }));
      toast.success('API key updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update API key');
    }
  },

  templates: [],
  isLoadingTemplates: false,
  fetchTemplates: async () => {
    set({ isLoadingTemplates: true });
    try {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      set({ templates: data, isLoadingTemplates: false });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load templates');
      set({ isLoadingTemplates: false });
    }
  },
  createTemplate: async (template) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (!res.ok) throw new Error('Failed to create template');
      toast.success('Template created');
      await get().fetchTemplates();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create template');
    }
  },
  updateTemplate: async (id, updates) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) throw new Error('Failed to update template');
      toast.success('Template updated');
      await get().fetchTemplates();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update template');
    }
  },
  deleteTemplate: async (id) => {
    try {
      const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete template');
      toast.success('Template deleted');
      await get().fetchTemplates();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete template');
    }
  }
}));
