"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wifi, Battery, Search } from 'lucide-react';

interface MenuBarProps {
  onSearchClick?: () => void;
}

export const MenuBar = ({ onSearchClick }: MenuBarProps) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (date: Date) =>
    date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <motion.div
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 h-[28px] glass flex items-center justify-between px-4 z-[9999] text-[13px] font-medium"
    >
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 cursor-default">
          <div className="w-4 h-4 bg-gold rounded-sm flex items-center justify-center text-bg-primary font-bold text-[10px]">
            M
          </div>
          <span className="font-bold tracking-tight">MAK OS</span>
        </div>

        <div className="flex items-center space-x-4 ml-2">
          {['File', 'Edit', 'View', 'Go', 'Window', 'Help'].map((item) => (
            <span
              key={item}
              className="cursor-default hover:bg-white/10 px-2 py-0.5 rounded transition-colors"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3 text-text-secondary">
          <Wifi size={14} className="hover:text-gold transition-colors cursor-default" />
          <Battery size={16} className="hover:text-gold transition-colors cursor-default" />
          <button
            onClick={onSearchClick}
            className="hover:text-gold transition-colors focus:outline-none"
            title="Spotlight (Cmd+Space)"
          >
            <Search size={14} />
          </button>
        </div>
        <div className="flex items-center space-x-2 cursor-default hover:bg-white/10 px-2 py-0.5 rounded transition-colors">
          <span>{formatDate(time)}</span>
          <span className="font-semibold">{formatTime(time)}</span>
        </div>
      </div>
    </motion.div>
  );
};
