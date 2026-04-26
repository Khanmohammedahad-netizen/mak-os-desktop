"use client";

import React from 'react';
import {
  Users, Handshake, FileText, CheckSquare,
  BarChart2, Cpu, Calendar, Terminal, Settings
} from 'lucide-react';
import { MenuBar } from './MenuBar';
import { Dock } from './Dock';
import { WindowManager } from './WindowManager';
import { DesktopIcon } from './DesktopIcon';

const DESKTOP_APPS = [
  { id: 'crm',       title: 'CRM',         icon: Users },
  { id: 'deals',     title: 'Deals',        icon: Handshake },
  { id: 'notes',     title: 'Notes',        icon: FileText },
  { id: 'tasks',     title: 'Tasks',        icon: CheckSquare },
  { id: 'analytics', title: 'Analytics',    icon: BarChart2 },
  { id: 'v1',        title: 'MAK OS v1',    icon: Cpu },
  { id: 'calendar',  title: 'Calendar',     icon: Calendar },
  { id: 'terminal',  title: 'Terminal',     icon: Terminal },
  { id: 'settings',  title: 'Settings',     icon: Settings },
];

export const Desktop = () => {
  return (
    <main
      className="relative w-full h-screen overflow-hidden bg-bg-primary select-none"
      style={{
        backgroundImage: 'radial-gradient(ellipse at 30% 40%, rgba(201,168,76,0.04) 0%, transparent 60%), radial-gradient(circle at center, #111113 0%, #08080A 100%)'
      }}
    >
      <MenuBar />

      {/* Desktop Icons — top-right grid */}
      <div className="absolute top-[44px] right-4 flex flex-col flex-wrap gap-1 max-h-[calc(100vh-130px)] items-end pt-2 z-[50]">
        {DESKTOP_APPS.map((app) => (
          <DesktopIcon key={app.id} id={app.id} title={app.title} icon={app.icon} />
        ))}
      </div>

      <WindowManager />
      <Dock />
    </main>
  );
};
