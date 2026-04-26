"use client";

import React, { useEffect, useCallback } from 'react';
import { NotesSidebar } from './NotesSidebar';
import { NotesList } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { useNotesStore } from '@/stores/notesStore';
import { Note } from '@/types';

const MOCK_NOTES: Note[] = [
  {
    id: 'mock-1',
    title: 'Q2 Strategy',
    content: 'Focus on enterprise pipeline. Key accounts: Apex, Meridian, Harlow Group.\n\nAction items:\n- Schedule exec briefings\n- Prep case studies\n- Update pricing deck',
    folder: 'General',
    pinned: true,
    tags: ['strategy', 'q2'],
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'mock-2',
    title: 'Meeting — Apex Corp',
    content: 'Attendees: Sarah K, Tom M, Dev lead.\n\nDecisions: Extend trial 30 days. Follow up by Friday with pricing deck.',
    folder: 'Meetings',
    pinned: false,
    tags: ['client', 'apex'],
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'mock-3',
    title: 'Product Ideas',
    content: 'AI-powered deal scoring\nSlack integration for activity log\nMobile companion app\nOffline mode',
    folder: 'Ideas',
    pinned: true,
    tags: ['product'],
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'mock-4',
    title: 'Harlow Group — Onboarding',
    content: 'Week 1: Data migration\nWeek 2: Team training\nWeek 3: Go-live\n\nContact: James H (james@harlow.io)',
    folder: 'Clients',
    pinned: false,
    tags: ['client', 'onboarding'],
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'mock-5',
    title: 'Personal Goals 2026',
    content: 'Run a half marathon\nRead 24 books\nLaunch side project by June\nLearn Arabic',
    folder: 'Personal',
    pinned: false,
    tags: [],
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
];

export const NotesApp = () => {
  const { setNotes, setLoading, addNote, setActiveNoteId, activeFolder } = useNotesStore();
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  useEffect(() => {
    if (useMock) {
      setNotes(MOCK_NOTES);
      return;
    }
    const fetchNotes = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/notes');
        const data = await res.json();
        if (Array.isArray(data)) setNotes(data);
      } catch (err) {
        console.error('Failed to fetch notes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, [useMock, setNotes, setLoading]);

  const handleNewNote = useCallback(async () => {
    const folder = ['all', 'pinned'].includes(activeFolder) ? 'General' : activeFolder;

    if (useMock) {
      const note: Note = {
        id: `mock-${Date.now()}`,
        title: 'Untitled',
        content: '',
        folder,
        pinned: false,
        tags: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addNote(note);
      setActiveNoteId(note.id);
      return;
    }

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled', content: '', folder, pinned: false }),
      });
      if (!res.ok) throw new Error('Failed to create note');
      const note = await res.json();
      addNote(note);
      setActiveNoteId(note.id);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  }, [activeFolder, useMock, addNote, setActiveNoteId]);

  // ⌘N = new note
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewNote();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNewNote]);

  return (
    <div className="flex h-full overflow-hidden bg-bg-surface/20">
      <NotesSidebar onNewNote={handleNewNote} />
      <NotesList onNewNote={handleNewNote} />
      <NoteEditor />
    </div>
  );
};
