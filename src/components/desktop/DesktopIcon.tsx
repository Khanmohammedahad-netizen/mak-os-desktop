"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/windowStore';

interface DesktopIconProps {
  id: string;
  title: string;
  icon: React.ElementType;
}

export const DesktopIcon = ({ id, title, icon: Icon }: DesktopIconProps) => {
  const { openWindow, windows } = useWindowStore();
  const isOpen = windows.some(w => w.id === id);
  const [lastClick, setLastClick] = useState(0);

  const handleClick = () => {
    const now = Date.now();
    if (now - lastClick < 400) {
      // Double-click
      openWindow(id, title);
    }
    setLastClick(now);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={cn(
        'flex flex-col items-center space-y-1.5 p-2 rounded-xl cursor-default transition-colors select-none w-20',
        'hover:bg-white/10 active:bg-white/15'
      )}
    >
      <div className={cn(
        'w-12 h-12 rounded-xl glass flex items-center justify-center border transition-all',
        isOpen ? 'border-gold/30 bg-gold/10' : 'border-gold/10'
      )}>
        <Icon size={22} className={cn(isOpen ? 'text-gold' : 'text-text-secondary')} />
      </div>
      <span className="text-[11px] font-medium text-center text-text-primary leading-tight max-w-full truncate w-full text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {title}
      </span>
    </motion.div>
  );
};
