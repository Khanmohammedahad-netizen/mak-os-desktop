"use client";

import React, { useState } from 'react';
import { Search, Pin, PinOff, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotesStore } from '@/stores/notesStore';

export const NotesList = () => {
  const { notes, activeNoteId, setActiveNoteId, activeFolder, loading } = useNotesStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (note.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeFolder === 'all') return matchesSearch;
    if (activeFolder === 'pinned') return matchesSearch && note.pinned;
    return matchesSearch && note.folder === activeFolder;
  });

  // Sort: Pinned first, then by date
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <div className="w-80 border-r border-gold/10 flex flex-col bg-black/5">
      {/* Search Header */}
      <div className="p-4 border-b border-gold/5 bg-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-gold/10 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all"
          />
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-auto">
        {loading && notes.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : sortedNotes.length > 0 ? (
          <div className="divide-y divide-gold/5">
            {sortedNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => setActiveNoteId(note.id)}
                className={cn(
                  "w-full text-left p-4 transition-all group relative overflow-hidden",
                  activeNoteId === note.id 
                    ? "bg-gold/10" 
                    : "hover:bg-white/5"
                )}
              >
                {activeNoteId === note.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold" />
                )}
                
                <div className="flex items-start justify-between mb-1">
                  <h4 className={cn(
                    "text-[13px] font-semibold truncate flex-1 pr-2 transition-colors",
                    activeNoteId === note.id ? "text-gold" : "text-text-primary group-hover:text-text-primary"
                  )}>
                    {note.title || 'Untitled Note'}
                  </h4>
                  {note.pinned && <Pin size={10} className="text-gold mt-1" fill="currentColor" />}
                </div>
                
                <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed mb-2 opacity-60">
                  {note.content || 'No additional text'}
                </p>
                
                <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-text-secondary/40">
                  <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                  <span>{note.folder || 'Notes'}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-xs text-text-secondary italic">No notes found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
