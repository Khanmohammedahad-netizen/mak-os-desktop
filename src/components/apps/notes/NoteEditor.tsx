"use client";

import React, { useEffect, useState, useRef } from 'react';
import { 
  Pin, PinOff, Trash2, Maximize2, 
  Share, Check, Clock, Cloud, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotesStore } from '@/stores/notesStore';
import { Button } from '@/components/shared/Button';

export const NoteEditor = () => {
  const { notes, activeNoteId, updateNote, deleteNote } = useNotesStore();
  const activeNote = notes.find(n => n.id === activeNoteId);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state when active note changes
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title || '');
      setContent(activeNote.content || '');
      setLastSaved(new Date(activeNote.updated_at));
    } else {
      setTitle('');
      setContent('');
      setLastSaved(null);
    }
  }, [activeNoteId, activeNote]);

  const handlePinToggle = async () => {
    if (!activeNoteId || !activeNote) return;
    const newPinned = !activeNote.pinned;
    updateNote(activeNoteId, { pinned: newPinned });
    try {
      await fetch(`/api/notes/${activeNoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned }),
      });
    } catch {
      updateNote(activeNoteId, { pinned: activeNote.pinned });
    }
  };

  const handleDelete = async () => {
    if (!activeNoteId) return;
    deleteNote(activeNoteId);
    try {
      await fetch(`/api/notes/${activeNoteId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  // Auto-save logic
  const triggerAutoSave = (newTitle: string, newContent: string) => {
    if (!activeNoteId) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    setIsSaving(true);
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/notes/${activeNoteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle, content: newContent }),
        });

        if (response.ok) {
          updateNote(activeNoteId, { title: newTitle, content: newContent });
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error('Failed to auto-save note:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1s debounce
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerAutoSave(val, content);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerAutoSave(title, val);
  };

  if (!activeNoteId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-black/5">
        <div className="w-16 h-16 bg-gold/5 rounded-2xl flex items-center justify-center mb-4 border border-gold/10">
          <FileTextIcon className="text-gold/20" size={32} />
        </div>
        <h3 className="text-text-secondary font-medium text-sm">Select a note to view or edit</h3>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-surface/10 relative">
      {/* Editor Header */}
      <div className="px-8 py-4 flex items-center justify-between border-b border-gold/5">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-[10px] uppercase tracking-wider font-bold text-text-secondary/50">
            {isSaving ? (
              <>
                <Cloud size={12} className="animate-pulse" />
                <span>Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <Check size={12} className="text-green-500/50" />
                <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : (
              <span>Draft</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePinToggle}>
            {activeNote?.pinned ? <PinOff size={14} className="text-gold" /> : <Pin size={14} />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-os-red hover:bg-os-red/10" onClick={handleDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Title Area */}
      <div className="px-12 py-8">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Note Title"
          className="w-full bg-transparent text-3xl font-display font-semibold text-text-primary focus:outline-none placeholder:text-text-secondary/20 tracking-tight"
        />
        <div className="mt-4 flex items-center space-x-3 text-[11px] text-text-secondary/40 font-medium border-b border-gold/5 pb-4">
          <Calendar size={12} />
          <span>Created {new Date(activeNote?.created_at || '').toLocaleDateString()}</span>
          <span className="w-1 h-1 rounded-full bg-gold/20" />
          <Clock size={12} />
          <span>Last edited {lastSaved?.toLocaleString()}</span>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 px-12 pb-20">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing..."
          className="w-full h-full bg-transparent text-lg text-text-secondary leading-relaxed focus:outline-none resize-none placeholder:text-text-secondary/10 font-sans"
        />
      </div>
    </div>
  );
};

const FileTextIcon = ({ className, size }: { className?: string; size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
