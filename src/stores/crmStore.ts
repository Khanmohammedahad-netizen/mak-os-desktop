import { create } from 'zustand';
import { Contact } from '@/types';

interface CRMStore {
  contacts: Contact[];
  loading: boolean;
  activeContactId: string | null;

  setContacts: (contacts: Contact[]) => void;
  setLoading: (loading: boolean) => void;
  setActiveContactId: (id: string | null) => void;
  fetchContacts: () => Promise<void>;
  updateContactStatus: (id: string, status: string) => void;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  addContact: (contact: Contact) => void;
  removeContact: (id: string) => void;
}

export const useCRMStore = create<CRMStore>((set) => ({
  contacts: [],
  loading: false,
  activeContactId: null,

  setContacts: (contacts) => set({ contacts }),
  setLoading: (loading) => set({ loading }),
  setActiveContactId: (activeContactId) => set({ activeContactId }),

  fetchContacts: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/contacts');
      const data: unknown = await res.json();
      set({ contacts: Array.isArray(data) ? (data as Contact[]) : [] });
    } catch (err) {
      console.error('[crmStore] fetchContacts failed:', err);
    } finally {
      set({ loading: false });
    }
  },

  updateContactStatus: (id, status) => set((state) => ({
    contacts: state.contacts.map((c) =>
      c.id === id ? { ...c, status, updated_at: new Date().toISOString() } : c
    ),
  })),

  updateContact: (id, updates) => set((state) => ({
    contacts: state.contacts.map((c) =>
      c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
    ),
  })),

  addContact: (contact) => set((state) => ({
    contacts: [contact, ...state.contacts],
  })),

  removeContact: (id) => set((state) => ({
    contacts: state.contacts.filter((c) => c.id !== id),
    activeContactId: state.activeContactId === id ? null : state.activeContactId,
  })),
}));
