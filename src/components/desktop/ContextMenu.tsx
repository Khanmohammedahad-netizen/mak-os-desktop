"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Users, CheckSquare } from 'lucide-react';
import { useWindowStore } from '@/stores/windowStore';

interface ContextMenuProps {
  pos: { x: number; y: number } | null;
  onClose: () => void;
}

const ACTIONS = [
  { label: 'New Note',    icon: FileText,    appId: 'notes', appTitle: 'Notes — MAK OS' },
  { label: 'New Contact', icon: Users,       appId: 'crm',   appTitle: 'CRM — MAK OS' },
  { label: 'New Task',    icon: CheckSquare, appId: 'tasks', appTitle: 'Tasks — MAK OS' },
];

export const DesktopContextMenu = ({ pos, onClose }: ContextMenuProps) => {
  const { openWindow } = useWindowStore();

  useEffect(() => {
    const close = () => onClose();
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [onClose]);

  // Clamp so menu doesn't go off-screen
  const menuW = 192;
  const menuH = 120;
  const x = pos ? Math.min(pos.x, (typeof window !== 'undefined' ? window.innerWidth : 1280) - menuW - 8) : 0;
  const y = pos ? Math.min(pos.y, (typeof window !== 'undefined' ? window.innerHeight : 768) - menuH - 8) : 0;

  return (
    <AnimatePresence>
      {pos && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="fixed z-[99980] rounded-xl shadow-xl border border-gold/15 overflow-hidden"
          style={{
            left: x,
            top: y,
            minWidth: menuW,
            background: 'rgba(12,12,16,0.96)',
            backdropFilter: 'blur(32px)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="py-1.5">
            {ACTIONS.map((a, i) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => { openWindow(a.appId, a.appTitle); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-secondary hover:bg-gold/10 hover:text-gold transition-colors text-left"
                  style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                >
                  <Icon size={13} />
                  {a.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
