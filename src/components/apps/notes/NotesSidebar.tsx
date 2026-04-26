"use client";

import React from 'react';
import { FileText, Folder, Users, Lightbulb, BookOpen, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotesStore } from '@/stores/notesStore';

const FIXED_FOLDERS = [
  { id: 'all',      label: 'All Notes', icon: FileText },
  { id: 'General',  label: 'General',   icon: Folder },
  { id: 'Clients',  label: 'Clients',   icon: Users },
  { id: 'Ideas',    label: 'Ideas',     icon: Lightbulb },
  { id: 'Meetings', label: 'Meetings',  icon: BookOpen },
  { id: 'Personal', label: 'Personal',  icon: User },
];

interface NotesSidebarProps {
  onNewNote: () => void;
}

export const NotesSidebar = ({ onNewNote }: NotesSidebarProps) => {
  const { notes, activeFolder, setActiveFolder } = useNotesStore();

  const getCount = (id: string) => {
    if (id === 'all') return notes.length;
    return notes.filter((n) => n.folder === id).length;
  };

  return (
    <div className="w-[200px] flex-shrink-0 border-r border-gold/10 bg-black/25 flex flex-col py-4">
      <div className="px-4 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/40">Notes</p>
      </div>

      <div className="flex-1 overflow-auto space-y-0.5 px-2">
        {FIXED_FOLDERS.map((folder) => {
          const isActive = activeFolder === folder.id;
          const count = getCount(folder.id);
          return (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={cn(
                'relative w-full flex items-center justify-between pl-3 pr-2 py-1.5 rounded-md text-[13px] transition-colors duration-100',
                isActive
                  ? 'text-gold bg-[#1A1A1D]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-[#1A1A1D]'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-gold" />
              )}
              <div className="flex items-center space-x-2.5 min-w-0">
                <folder.icon
                  size={14}
                  className={cn('flex-shrink-0', isActive ? 'text-gold' : 'text-text-secondary')}
                />
                <span className="font-medium truncate">{folder.label}</span>
              </div>
              {count > 0 && (
                <span className={cn(
                  'text-[10px] tabular-nums flex-shrink-0 ml-1',
                  isActive ? 'text-gold/70' : 'text-text-secondary/35'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-2 pt-3 mt-2 border-t border-gold/5">
        <button
          onClick={onNewNote}
          className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg border border-dashed border-gold/25 text-gold/70 hover:text-gold hover:border-gold/40 hover:bg-gold/5 transition-all text-[12px] font-medium"
        >
          <Plus size={13} />
          <span>New Note</span>
        </button>
      </div>
    </div>
  );
};
