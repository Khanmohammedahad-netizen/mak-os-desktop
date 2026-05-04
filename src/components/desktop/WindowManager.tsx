"use client";

import React, { memo } from 'react';
import dynamic from 'next/dynamic';
import { useWindowStore } from '@/stores/windowStore';
import { Window } from './Window';

const LeadMineApp      = dynamic(() => import('../apps/lead-mine/LeadMineApp').then((m) => ({ default: m.LeadMineApp })),           { ssr: false });
const LeadAuditApp     = dynamic(() => import('../apps/lead-audit/LeadAuditApp').then((m) => ({ default: m.LeadAuditApp })),         { ssr: false });
const OutreachApp      = dynamic(() => import('../apps/outreach/OutreachApp').then((m) => ({ default: m.OutreachApp })),             { ssr: false });
const PipelineApp      = dynamic(() => import('../apps/pipeline/PipelineApp').then((m) => ({ default: m.PipelineApp })),             { ssr: false });
const CommandCenterApp = dynamic(() => import('../apps/command-center/CommandCenterApp').then((m) => ({ default: m.CommandCenterApp })), { ssr: false });
const SettingsApp      = dynamic(() => import('../apps/settings/SettingsApp').then((m) => ({ default: m.SettingsApp })),             { ssr: false });

const renderApp = (id: string) => {
  switch (id) {
    case 'lead-mine':      return <LeadMineApp />;
    case 'lead-audit':     return <LeadAuditApp />;
    case 'outreach':       return <OutreachApp />;
    case 'pipeline':       return <PipelineApp />;
    case 'command-center': return <CommandCenterApp />;
    case 'settings':       return <SettingsApp />;
    default:               return null;
  }
};

export const WindowManager = memo(() => {
  const { windows } = useWindowStore();

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <div className="relative w-full h-full pointer-events-auto">
        {windows.map((win) => (
          <Window key={win.id} window={win}>
            {renderApp(win.id)}
          </Window>
        ))}
      </div>
    </div>
  );
});
WindowManager.displayName = 'WindowManager';
