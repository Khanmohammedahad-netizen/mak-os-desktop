"use client";

import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Search, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MenuBar = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-[28px] glass flex items-center justify-between px-4 z-[9999] text-[13px] font-medium">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 cursor-default">
          <div className="w-4 h-4 bg-gold rounded-sm flex items-center justify-center text-bg-primary font-bold text-[10px]">
            M
          </div>
          <span className="font-bold tracking-tight">MAK OS</span>
        </div>
        
        <div className="flex items-center space-x-4 ml-2">
          {["File", "Edit", "View", "Go", "Window", "Help"].map((item) => (
            <span key={item} className="cursor-default hover:bg-white/10 px-2 py-0.5 rounded transition-colors">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3 text-text-secondary">
          <Wifi size={14} className="hover:text-gold transition-colors cursor-default" />
          <Battery size={16} className="hover:text-gold transition-colors cursor-default" />
          <Search size={14} className="hover:text-gold transition-colors cursor-default" />
        </div>
        <div className="flex items-center space-x-2 cursor-default hover:bg-white/10 px-2 py-0.5 rounded transition-colors">
          <span>{formatDate(time)}</span>
          <span className="font-semibold">{formatTime(time)}</span>
        </div>
      </div>
    </div>
  );
};
