"use client";

import React from 'react';
import { 
  FileText, Star, Folder, Trash2, 
  ChevronRight, Plus, FolderPlus 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotesStore } from '@/stores/notesStore';

export const NotesSidebar = () => {
  const { activeFolder, setActiveFolder, notes } = useNotesStore();

  const folders = [
    { id: 'all', label: 'All Notes', icon: FileText, count: notes.length },
    { id: 'pinned', label: 'Pinned', icon: Star, count: notes.filter(n => n.pinned).length },
    { id: 'trash', label: 'Trash', icon: Trash2, count: 0 },
  ];

  // Unique folders from notes
  const customFolders = Array.from(new Set(notes.map(n => n.folder).filter(Boolean)));

  return (
    <div className="w-64 border-r border-gold/10 bg-black/20 flex flex-col p-4 space-y-8">
      {/* Smart Folders */}
      <div className="space-y-1">
        <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">MAK OS Notes</h3>
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setActiveFolder(folder.id)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all group",
              activeFolder === folder.id 
                ? "bg-gold/10 text-gold shadow-[inset_0_0_10px_rgba(201,168,76,0.05)]" 
                : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
            )}
          >
            <div className="flex items-center space-x-3">
              <folder.icon size={16} className={cn(
                activeFolder === folder.id ? "text-gold" : "text-text-secondary group-hover:text-text-primary"
              )} />
              <span className="font-medium">{folder.label}</span>
            </div>
            <span className="text-[10px] opacity-40">{folder.count}</span>
          </button>
        ))}
      </div>

      {/* Custom Folders */}
      <div className="space-y-1">
        <div className="px-3 flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Folders</h3>
          <button className="text-text-secondary hover:text-gold transition-colors">
            <FolderPlus size={14} />
          </button>
        </div>
        
        {customFolders.map((folderName: any) => (
          <button
            key={folderName}
            onClick={() => setActiveFolder(folderName)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all group",
              activeFolder === folderName 
                ? "bg-gold/10 text-gold" 
                : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
            )}
          >
            <div className="flex items-center space-x-3">
              <Folder size={16} className={cn(
                activeFolder === folderName ? "text-gold" : "text-text-secondary group-hover:text-text-primary"
              )} />
              <span className="font-medium">{folderName}</span>
            </div>
          </button>
        ))}

        {customFolders.length === 0 && (
          <p className="px-3 text-[11px] italic text-text-secondary/40 py-2">No custom folders</p>
        )}
      </div>

      {/* New Note Button (Bottom of Sidebar) */}
      <div className="mt-auto pt-4">
        <button 
          className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl border border-gold/20 bg-gold/5 text-gold hover:bg-gold/10 transition-all active:scale-95 text-sm font-medium"
        >
          <Plus size={16} />
          <span>New Note</span>
        </button>
      </div>
    </div>
  );
};
