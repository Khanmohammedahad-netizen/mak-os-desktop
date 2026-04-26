"use client";

import React, { useRef } from 'react';
import { 
  motion, 
  useMotionValue, 
  useSpring, 
  useTransform,
  MotionValue
} from 'framer-motion';
import { 
  Users, 
  Handshake, 
  FileText, 
  CheckSquare, 
  BarChart2, 
  Cpu, 
  Calendar, 
  Terminal, 
  Settings 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWindowStore } from '@/stores/windowStore';

const APPS = [
  { id: 'crm', title: 'CRM — MAK OS', icon: Users },
  { id: 'deals', title: 'Deals', icon: Handshake },
  { id: 'notes', title: 'Notes', icon: FileText },
  { id: 'tasks', title: 'Tasks', icon: CheckSquare },
  { id: 'analytics', title: 'Analytics', icon: BarChart2 },
  { id: 'v1', title: 'MAK OS v1', icon: Cpu },
  { id: 'calendar', title: 'Calendar', icon: Calendar },
  { id: 'terminal', title: 'Terminal', icon: Terminal },
  { id: 'settings', title: 'Settings', icon: Settings },
];

export const Dock = () => {
  const mouseX = useMotionValue(Infinity);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]">
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-center gap-2 px-3 py-2 glass rounded-2xl"
      >
        {APPS.map((app) => (
          <DockIcon key={app.id} mouseX={mouseX} app={app} />
        ))}
      </motion.div>
    </div>
  );
};

interface DockIconProps {
  mouseX: MotionValue;
  app: {
    id: string;
    title: string;
    icon: React.ElementType;
  };
}

const DockIcon = ({ mouseX, app }: DockIconProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { openWindow, windows } = useWindowStore();
  const isOpen = windows.some(w => w.id === app.id);

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
        onClick={() => openWindow(app.id, app.title)}
        className={cn(
          "aspect-square rounded-xl glass flex items-center justify-center cursor-pointer transition-colors duration-200",
          "hover:bg-gold/10 hover:border-gold/30",
          isOpen && "border-gold/20"
        )}
      >
        <app.icon className="w-1/2 h-1/2 text-text-secondary group-hover:text-gold transition-colors" />
      </motion.div>
      
      {/* Tooltip */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 glass rounded text-[11px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {app.title}
      </div>

      {/* Indicator */}
      {isOpen && (
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-gold rounded-full shadow-[0_0_5px_rgba(201,168,76,0.8)]" />
      )}
    </div>
  );
};
