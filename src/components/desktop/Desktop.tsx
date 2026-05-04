"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, ScanSearch, Send, Kanban,
  BarChart3, Settings,
} from 'lucide-react';
import { MenuBar } from './MenuBar';
import { Dock } from './Dock';
import { WindowManager } from './WindowManager';
import { DesktopIcon } from './DesktopIcon';
import { BootScreen } from './BootScreen';
import { Spotlight } from './Spotlight';
import { DesktopContextMenu } from './ContextMenu';
import { ToastContainer } from '@/components/shared/Toast';
import { useWindowStore } from '@/stores/windowStore';

const DESKTOP_APPS = [
  { id: 'lead-mine',      title: 'Lead Mine — MAK OS',      icon: Search },
  { id: 'lead-audit',     title: 'Lead Audit — MAK OS',     icon: ScanSearch },
  { id: 'outreach',       title: 'Outreach — MAK OS',       icon: Send },
  { id: 'pipeline',       title: 'Pipeline — MAK OS',       icon: Kanban },
  { id: 'command-center', title: 'Command Center — MAK OS', icon: BarChart3 },
  { id: 'settings',       title: 'Settings — MAK OS',       icon: Settings },
];

export const Desktop = () => {
  const [booted, setBooted] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const { activeWindowId, closeWindow, minimizeWindow } = useWindowStore();

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key === ' ') {
        e.preventDefault();
        setSpotlightOpen((s) => !s);
      }
      if (isMeta && e.key === 'w') {
        e.preventDefault();
        if (activeWindowId) closeWindow(activeWindowId);
      }
      if (isMeta && e.key === 'm') {
        e.preventDefault();
        if (activeWindowId) minimizeWindow(activeWindowId);
      }
      if (e.key === 'Escape') {
        setSpotlightOpen(false);
        setContextMenu(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeWindowId, closeWindow, minimizeWindow]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <>
      <BootScreen onComplete={() => setBooted(true)} />

      <motion.main
        className="relative w-full h-screen overflow-hidden bg-bg-primary select-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 30% 40%, rgba(201,168,76,0.04) 0%, transparent 60%), radial-gradient(circle at center, #111113 0%, #08080A 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: booted ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        onContextMenu={handleContextMenu}
        onClick={() => setContextMenu(null)}
      >
        {/* Menu bar — slides down after boot */}
        {booted && <MenuBar onSearchClick={() => setSpotlightOpen(true)} />}

        {/* Desktop icons — top-right grid */}
        <div className="absolute top-[44px] right-4 flex flex-col flex-wrap gap-1 max-h-[calc(100vh-130px)] items-end pt-2 z-[50]">
          {DESKTOP_APPS.map((app) => (
            <DesktopIcon key={app.id} id={app.id} title={app.title} icon={app.icon} />
          ))}
        </div>

        <WindowManager />

        {/* Dock — slides up after boot */}
        {booted && <Dock />}

        <ToastContainer />
      </motion.main>

      <Spotlight open={spotlightOpen} onClose={() => setSpotlightOpen(false)} />
      <DesktopContextMenu pos={contextMenu} onClose={() => setContextMenu(null)} />
    </>
  );
};
