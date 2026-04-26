import { create } from 'zustand';
import { Note } from '@/types';

interface NotesStore {
  notes: Note[];
  activeNoteId: string | null;
  activeFolder: string;
  loading: boolean;
  
  setNotes: (notes: Note[]) => void;
  setActiveNoteId: (id: string | null) => void;
  setActiveFolder: (folder: string) => void;
  setLoading: (loading: boolean) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  addNote: (note: Note) => void;
}

export const useNotesStore = create<NotesStore>((set) => ({
  notes: [],
  activeNoteId: null,
  activeFolder: 'all',
  loading: false,

  setNotes: (notes) => set({ notes }),
  setActiveNoteId: (activeNoteId) => set({ activeNoteId }),
  setActiveFolder: (activeFolder) => set({ activeFolder }),
  setLoading: (loading) => set({ loading }),
  
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((n) => 
      n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
    )
  })),

  addNote: (note) => set((state) => ({
    notes: [note, ...state.notes]
  })),
}));
