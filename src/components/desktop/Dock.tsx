"use client";

import React, { memo, useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
} from 'framer-motion';
import {
  Users, Handshake, FileText, CheckSquare,
  BarChart2, Cpu, Calendar, Terminal, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/windowStore';

const MAIN_APPS = [
  { id: 'crm',       title: 'CRM — MAK OS',      icon: Users },
  { id: 'deals',     title: 'Deals — MAK OS',     icon: Handshake },
  { id: 'notes',     title: 'Notes — MAK OS',     icon: FileText },
  { id: 'tasks',     title: 'Tasks — MAK OS',     icon: CheckSquare },
  { id: 'analytics', title: 'Analytics — MAK OS', icon: BarChart2 },
  { id: 'v1',        title: 'MAK OS v1 — MAK OS', icon: Cpu },
  { id: 'calendar',  title: 'Calendar — MAK OS',  icon: Calendar },
  { id: 'terminal',  title: 'Terminal — MAK OS',  icon: Terminal },
];

const UTILITY_APPS = [
  { id: 'settings', title: 'Settings — MAK OS', icon: Settings },
];

export const Dock = () => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]"
    >
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-center gap-2 px-3 py-2 glass rounded-2xl"
      >
        {MAIN_APPS.map((app) => (
          <DockIcon key={app.id} mouseX={mouseX} app={app} />
        ))}

        {/* Separator */}
        <div className="w-px h-8 bg-gold/15 mx-1 rounded-full self-center" />

        {UTILITY_APPS.map((app) => (
          <DockIcon key={app.id} mouseX={mouseX} app={app} />
        ))}
      </motion.div>
    </motion.div>
  );
};

interface DockIconProps {
  mouseX: MotionValue;
  app: { id: string; title: string; icon: React.ElementType };
}

const DockIcon = memo(({ mouseX, app }: DockIconProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { openWindow, windows } = useWindowStore();
  const isOpen = windows.some((w) => w.id === app.id);

  // Bounce on open
  const prevOpenRef = useRef(false);
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (!prevOpenRef.current && isOpen) {
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 650);
      return () => clearTimeout(t);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [40, 64, 40]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <div className="relative group">
      <motion.div
        ref={ref}
        style={{ width }}
        animate={bouncing ? { y: [0, -10, 0, -5, 0] } : { y: 0 }}
        transition={bouncing ? { duration: 0.55, ease: 'easeOut' } : undefined}
        onClick={() => openWindow(app.id, app.title)}
        className={cn(
          'aspect-square rounded-xl glass flex items-center justify-center cursor-pointer transition-colors duration-200',
          'hover:bg-gold/10 hover:border-gold/30',
          isOpen && 'border-gold/20'
        )}
      >
        <app.icon className="w-1/2 h-1/2 text-text-secondary group-hover:text-gold transition-colors" />
      </motion.div>

      {/* Tooltip */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 glass rounded-lg text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-gold/10">
        {app.title.replace(' — MAK OS', '')}
      </div>

      {/* Open indicator */}
      {isOpen && (
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-gold rounded-full shadow-[0_0_5px_rgba(201,168,76,0.8)]" />
      )}
    </div>
  );
});
DockIcon.displayName = 'DockIcon';
