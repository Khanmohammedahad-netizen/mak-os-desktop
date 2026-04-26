import { create } from 'zustand';
import { Contact } from '@/types';

interface CRMStore {
  contacts: Contact[];
  loading: boolean;
  activeContactId: string | null;
  
  setContacts: (contacts: Contact[]) => void;
  setLoading: (loading: boolean) => void;
  setActiveContactId: (id: string | null) => void;
  updateContactStatus: (id: string, status: string) => void;
}

export const useCRMStore = create<CRMStore>((set) => ({
  contacts: [],
  loading: false,
  activeContactId: null,

  setContacts: (contacts) => set({ contacts }),
  setLoading: (loading) => set({ loading }),
  setActiveContactId: (activeContactId) => set({ activeContactId }),
  
  updateContactStatus: (id, status) => set((state) => ({
    contacts: state.contacts.map((c) => 
      c.id === id ? { ...c, status, updated_at: new Date().toISOString() } : c
    )
  })),
}));
