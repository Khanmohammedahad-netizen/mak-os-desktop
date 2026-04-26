"use client";

import React, { useEffect } from 'react';
import { NotesSidebar } from './NotesSidebar';
import { NotesList } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { useNotesStore } from '@/stores/notesStore';

export const NotesApp = () => {
  const { setNotes, setLoading } = useNotesStore();

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/notes');
        const data = await response.json();
        if (Array.isArray(data)) {
          setNotes(data);
        }
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [setNotes, setLoading]);

  return (
    <div className="flex h-full bg-bg-surface/30 overflow-hidden">
      {/* Sidebar - Left Pane */}
      <NotesSidebar />

      {/* Note List - Middle Pane */}
      <NotesList />

      {/* Editor - Right Pane */}
      <NoteEditor />
    </div>
  );
};
