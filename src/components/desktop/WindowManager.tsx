"use client";

import React from 'react';
import { useWindowStore } from '@/stores/windowStore';
import { Window } from './Window';
import { CRMApp } from '../apps/crm/CRMApp';
import { NotesApp } from '../apps/notes/NotesApp';
import { DealsApp } from '../apps/deals/DealsApp';
import { TasksApp } from '../apps/tasks/TasksApp';
import { AnalyticsApp } from '../apps/analytics/AnalyticsApp';
import { CalendarApp } from '../apps/calendar/CalendarApp';
import { TerminalApp } from '../apps/terminal/TerminalApp';
import { SettingsApp } from '../apps/settings/SettingsApp';
import { MakOSv1App } from '../apps/mak-os-v1/MakOSv1App';

export const WindowManager = () => {
  const { windows } = useWindowStore();

  const renderApp = (id: string) => {
    switch (id) {
      case 'crm':       return <CRMApp />;
      case 'notes':     return <NotesApp />;
      case 'deals':     return <DealsApp />;
      case 'tasks':     return <TasksApp />;
      case 'analytics': return <AnalyticsApp />;
      case 'calendar':  return <CalendarApp />;
      case 'terminal':  return <TerminalApp />;
      case 'settings':  return <SettingsApp />;
      case 'v1':        return <MakOSv1App />;
      default:          return null;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <div className="relative w-full h-full pointer-events-auto">
        {windows.map((window) => (
          <Window key={window.id} window={window}>
            {renderApp(window.id)}
          </Window>
        ))}
      </div>
    </div>
  );
};
