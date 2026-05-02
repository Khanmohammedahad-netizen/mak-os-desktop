"use client";

import React, { memo } from 'react';
import dynamic from 'next/dynamic';
import { useWindowStore } from '@/stores/windowStore';
import { Window } from './Window';

const CRMApp       = dynamic(() => import('../apps/crm/CRMApp').then((m) => ({ default: m.CRMApp })),                   { ssr: false });
const NotesApp     = dynamic(() => import('../apps/notes/NotesApp').then((m) => ({ default: m.NotesApp })),               { ssr: false });
const DealsApp     = dynamic(() => import('../apps/deals/DealsApp').then((m) => ({ default: m.DealsApp })),               { ssr: false });
const TasksApp     = dynamic(() => import('../apps/tasks/TasksApp').then((m) => ({ default: m.TasksApp })),               { ssr: false });
const AnalyticsApp = dynamic(() => import('../apps/analytics/AnalyticsApp').then((m) => ({ default: m.AnalyticsApp })),  { ssr: false });
const CalendarApp  = dynamic(() => import('../apps/calendar/CalendarApp').then((m) => ({ default: m.CalendarApp })),     { ssr: false });
const TerminalApp  = dynamic(() => import('../apps/terminal/TerminalApp').then((m) => ({ default: m.TerminalApp })),     { ssr: false });
const SettingsApp  = dynamic(() => import('../apps/settings/SettingsApp').then((m) => ({ default: m.SettingsApp })),    { ssr: false });
const OutreachApp  = dynamic(() => import('../apps/outreach/OutreachApp').then((m) => ({ default: m.OutreachApp })),    { ssr: false });
const DashboardApp = dynamic(() => import('../apps/dashboard/DashboardApp').then((m) => ({ default: m.DashboardApp })), { ssr: false });
const LeadsApp     = dynamic(() => import('../apps/leads/LeadsApp').then((m) => ({ default: m.LeadsApp })),             { ssr: false });
const WhatsAppApp  = dynamic(() => import('../apps/whatsapp/WhatsAppApp').then((m) => ({ default: m.WhatsAppApp })),   { ssr: false });
const EmailApp     = dynamic(() => import('../apps/email/EmailApp').then((m) => ({ default: m.EmailApp })),             { ssr: false });
const VoiceApp     = dynamic(() => import('../apps/voice/VoiceApp').then((m) => ({ default: m.VoiceApp })),             { ssr: false });
const PipelineApp  = dynamic(() => import('../apps/pipeline/PipelineApp').then((m) => ({ default: m.PipelineApp })),   { ssr: false });

const renderApp = (id: string) => {
  switch (id) {
    case 'dashboard': return <DashboardApp />;
    case 'leads':     return <LeadsApp />;
    case 'outreach':  return <OutreachApp />;
    case 'whatsapp':  return <WhatsAppApp />;
    case 'email':     return <EmailApp />;
    case 'voice':     return <VoiceApp />;
    case 'pipeline':  return <PipelineApp />;
    case 'crm':       return <CRMApp />;
    case 'notes':     return <NotesApp />;
    case 'deals':     return <DealsApp />;
    case 'tasks':     return <TasksApp />;
    case 'analytics': return <AnalyticsApp />;
    case 'calendar':  return <CalendarApp />;
    case 'terminal':  return <TerminalApp />;
    case 'settings':  return <SettingsApp />;
    default:          return null;
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
