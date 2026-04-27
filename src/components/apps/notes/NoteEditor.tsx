"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Star, Trash2, Check, Cloud, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNotesStore } from '@/stores/notesStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/shared/Button';

const FOLDERS = ['General', 'Clients', 'Ideas', 'Meetings', 'Personal'];

type SaveState = 'idle' | 'saving' | 'saved';

export const NoteEditor = () => {
  const { notes, activeNoteId, updateNote, deleteNote } = useNotesStore();
  const { toast } = useToastStore();
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  const activeNote = notes.find((n) => n.id === activeNoteId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when active note changes
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    if (savedTimeout.current) clearTimeout(savedTimeout.current);

    if (activeNote) {
      setTitle(activeNote.title || '');
      setContent(activeNote.content || '');
      setTagsInput(activeNote.tags?.join(', ') ?? '');
      setSaveState('idle');

      // Auto-focus + select title text for brand-new untitled notes
      if (activeNote.title === 'Untitled' && !activeNote.content) {
        requestAnimationFrame(() => {
          titleRef.current?.focus();
          titleRef.current?.select();
        });
      }
    }
  }, [activeNoteId]); // intentionally only on id change

  const scheduleSave = useCallback((newTitle: string, newContent: string, newTags: string) => {
    if (!activeNoteId) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    if (savedTimeout.current) clearTimeout(savedTimeout.current);
    setSaveState('saving');

    saveTimeout.current = setTimeout(async () => {
      const tagsArray = newTags
        ? newTags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];
      if (isMock) {
        updateNote(activeNoteId, { title: newTitle, content: newContent, tags: tagsArray });
        setSaveState('saved');
        toast('Note saved', 'info');
        savedTimeout.current = setTimeout(() => setSaveState('idle'), 2500);
        return;
      }
      try {
        const res = await fetch(`/api/notes/${activeNoteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle, content: newContent, tags: tagsArray }),
        });
        if (res.ok) {
          updateNote(activeNoteId, { title: newTitle, content: newContent, tags: tagsArray });
          setSaveState('saved');
          toast('Note saved', 'info');
          savedTimeout.current = setTimeout(() => setSaveState('idle'), 2500);
        }
      } catch {
        setSaveState('idle');
      }
    }, 1000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId, updateNote, isMock, toast]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    scheduleSave(val, content, tagsInput);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    scheduleSave(title, val, tagsInput);
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTagsInput(val);
    scheduleSave(title, content, val);
  };

  const handlePinToggle = async () => {
    if (!activeNote) return;
    const newPinned = !activeNote.pinned;
    updateNote(activeNote.id, { pinned: newPinned });
    try {
      await fetch(`/api/notes/${activeNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned }),
      });
    } catch {
      updateNote(activeNote.id, { pinned: activeNote.pinned });
    }
  };

  const handleFolderChange = async (folder: string) => {
    if (!activeNote) return;
    const prev = activeNote.folder;
    updateNote(activeNote.id, { folder });
    try {
      await fetch(`/api/notes/${activeNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
      });
    } catch {
      updateNote(activeNote.id, { folder: prev });
    }
  };

  // ⌘Backspace = delete active note (uses getState so no stale closure)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
        const { activeNoteId: id } = useNotesStore.getState();
        if (!id) return;
        e.preventDefault();
        useNotesStore.getState().deleteNote(id);
        fetch(`/api/notes/${id}`, { method: 'DELETE' }).catch(console.error);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!activeNoteId || !activeNote) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black/5">
        <div className="w-16 h-16 bg-gold/5 rounded-2xl flex items-center justify-center mb-4 border border-gold/10">
          <FileTextIcon className="text-gold/20" size={32} />
        </div>
        <p className="text-text-secondary text-sm font-medium">Select a note or create a new one</p>
        <p className="text-text-secondary/35 text-[12px] mt-1.5">⌘N to create</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="px-8 py-3 flex items-center justify-between border-b border-gold/5 flex-shrink-0">
        <AnimatePresence mode="wait">
          {saveState === 'saving' && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center space-x-1.5 text-[11px] text-text-secondary/45"
            >
              <Cloud size={11} className="animate-pulse" />
              <span>Saving...</span>
            </motion.div>
          )}
          {saveState === 'saved' && (
            <motion.div
              key="saved"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center space-x-1.5 text-[11px] text-text-secondary/45"
            >
              <Check size={11} className="text-green-500/60" />
              <span>Saved</span>
            </motion.div>
          )}
          {saveState === 'idle' && <div key="idle" />}
        </AnimatePresence>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handlePinToggle}
            title={activeNote.pinned ? 'Unpin note' : 'Pin note'}
          >
            <Star
              size={14}
              className={cn(activeNote.pinned ? 'text-gold' : 'text-text-secondary')}
              fill={activeNote.pinned ? 'currentColor' : 'none'}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-400 hover:bg-red-500/10"
            onClick={() => {
              deleteNote(activeNote.id);
              fetch(`/api/notes/${activeNote.id}`, { method: 'DELETE' }).catch(console.error);
            }}
            title="Delete note (⌘⌫)"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Title + Metadata */}
      <div className="px-10 pt-8 pb-4 flex-shrink-0">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full bg-transparent text-[28px] font-display font-semibold text-text-primary focus:outline-none placeholder:text-text-secondary/20 tracking-tight leading-tight mb-5"
        />

        {/* Metadata row */}
        <div className="flex items-center gap-3 pb-4 border-b border-gold/5">
          <select
            value={activeNote.folder}
            onChange={(e) => handleFolderChange(e.target.value)}
            className="bg-white/5 border border-gold/10 rounded-md px-2 py-1 text-[11px] text-text-secondary focus:outline-none focus:ring-1 focus:ring-gold/30 cursor-pointer flex-shrink-0"
          >
            {FOLDERS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
            <Tag size={11} className="text-text-secondary/40 flex-shrink-0" />
            <input
              type="text"
              value={tagsInput}
              onChange={handleTagsChange}
              placeholder="Add tags, comma-separated..."
              className="bg-transparent text-[11px] text-text-secondary focus:outline-none w-full placeholder:text-text-secondary/20"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-10 pb-20">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing..."
          className="w-full h-full min-h-[300px] bg-transparent text-[15px] text-text-secondary leading-[1.8] focus:outline-none resize-none placeholder:text-text-secondary/15 font-sans"
        />
      </div>
    </div>
  );
};

const FileTextIcon = ({ className, size }: { className?: string; size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={className}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
