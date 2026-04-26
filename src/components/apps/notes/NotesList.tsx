"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Search, Pin, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotesStore } from '@/stores/notesStore';
import { Note } from '@/types';

interface NotesListProps {
  onNewNote: () => void;
}

export const NotesList = ({ onNewNote }: NotesListProps) => {
  const { notes, activeNoteId, setActiveNoteId, activeFolder, loading, deleteNote } = useNotesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; noteId: string } | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const filteredNotes = notes.filter((note) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      note.title.toLowerCase().includes(q) ||
      (note.content || '').toLowerCase().includes(q);
    if (activeFolder === 'all') return matchesSearch;
    if (activeFolder === 'pinned') return matchesSearch && note.pinned;
    return matchesSearch && note.folder === activeFolder;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const folderLabel = activeFolder === 'all' ? 'All Notes' : activeFolder;

  const handleContextMenu = (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, noteId });
  };

  const handleDelete = async (noteId: string) => {
    setContextMenu(null);
    deleteNote(noteId);
    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
    } catch {
      console.error('Failed to delete note');
    }
  };

  const getPreview = (content: string | null | undefined) => {
    if (!content) return 'No additional text';
    const first = content.split('\n').find((l) => l.trim());
    return first?.trim() || 'No additional text';
  };

  return (
    <div className="w-[250px] flex-shrink-0 border-r border-gold/10 flex flex-col bg-black/10">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gold/5 flex-shrink-0">
        <h2 className="text-[13px] font-semibold text-text-primary mb-3 truncate">{folderLabel}</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary" size={12} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-gold/10 rounded-md pl-7 pr-3 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all"
          />
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-auto">
        {loading && notes.length === 0 ? (
          <div className="space-y-px pt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-gold/5">
                <div className="h-3 w-3/4 bg-white/10 rounded animate-pulse mb-2" />
                <div className="h-2.5 w-full bg-white/5 rounded animate-pulse mb-1.5" />
                <div className="h-2 w-1/3 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : sortedNotes.length > 0 ? (
          <div>
            {sortedNotes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isActive={activeNoteId === note.id}
                preview={getPreview(note.content)}
                onClick={() => setActiveNoteId(note.id)}
                onContextMenu={(e) => handleContextMenu(e, note.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-[12px] text-text-secondary mb-4">
              {searchQuery ? 'No notes match your search.' : 'No notes in this folder.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewNote}
                className="text-[12px] text-gold/70 hover:text-gold transition-colors border border-dashed border-gold/20 px-3 py-1.5 rounded-lg hover:border-gold/40 hover:bg-gold/5"
              >
                Create a note
              </button>
            )}
          </div>
        )}
      </div>

      {/* New Note button */}
      <div className="p-3 border-t border-gold/5 flex-shrink-0">
        <button
          onClick={onNewNote}
          className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg border border-dashed border-gold/25 text-gold/70 hover:text-gold hover:border-gold/40 hover:bg-gold/5 transition-all text-[12px] font-medium"
        >
          <Plus size={13} />
          <span>New Note</span>
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextRef}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }}
          className="z-[200] glass border border-gold/20 rounded-xl shadow-2xl overflow-hidden py-1 w-40"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleDelete(contextMenu.noteId)}
            className="w-full flex items-center space-x-2.5 px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={12} />
            <span>Delete Note</span>
          </button>
        </div>
      )}
    </div>
  );
};

interface NoteItemProps {
  note: Note;
  isActive: boolean;
  preview: string;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const NoteItem = ({ note, isActive, preview, onClick, onContextMenu }: NoteItemProps) => {
  const dateStr = new Date(note.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'relative w-full text-left px-4 py-3 border-b border-gold/5 transition-colors duration-100',
        isActive ? 'bg-[#1A1A1D]' : 'hover:bg-[#1A1A1D]/50'
      )}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gold rounded-r" />}
      <div className="flex items-start justify-between gap-1 mb-1">
        <h4 className={cn(
          'text-[13px] font-medium leading-snug truncate flex-1 transition-colors',
          isActive ? 'text-gold' : 'text-text-primary'
        )}>
          {note.title || 'Untitled'}
        </h4>
        {note.pinned && (
          <Pin size={9} className="text-gold mt-0.5 flex-shrink-0" fill="currentColor" />
        )}
      </div>
      <p className="text-[11px] text-text-secondary/55 truncate leading-relaxed mb-1.5">{preview}</p>
      <span className="text-[10px] text-text-secondary/30 font-medium">{dateStr}</span>
    </button>
  );
};
