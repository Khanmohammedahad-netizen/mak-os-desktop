"use client";

import React from 'react';
import {
  Cpu, LayoutDashboard, Users, Send, MessageCircle,
  Mail, Phone, Columns, Settings, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const V1_BASE = 'https://mak-os.onrender.com';

const PAGES = [
  { id: 'dashboard', label: 'Dashboard',   path: '',             icon: LayoutDashboard },
  { id: 'leads',     label: 'Leads',        path: '/leads',       icon: Users },
  { id: 'outreach',  label: 'Outreach',     path: '/outreach',    icon: Send },
  { id: 'whatsapp',  label: 'WhatsApp',     path: '/whatsapp',    icon: MessageCircle },
  { id: 'email',     label: 'Email',        path: '/email',       icon: Mail },
  { id: 'voice',     label: 'Voice Calls',  path: '/voice-calls', icon: Phone },
  { id: 'pipeline',  label: 'Pipeline',     path: '/pipeline',    icon: Columns },
  { id: 'settings',  label: 'Settings',     path: '/settings',    icon: Settings },
];

export const MakOSv1App = () => {
  const open = (path: string) => {
    window.open(`${V1_BASE}${path}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-[220px] flex-shrink-0 flex flex-col bg-[#0D0D0F] border-r border-gold/10">
        {/* Header */}
        <div className="p-5 border-b border-gold/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <Cpu size={18} className="text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-text-primary truncate">MAK OS v1</p>
              <p className="text-[10px] text-text-secondary truncate">Autonomous Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">Live System</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-auto">
          {PAGES.map((page) => {
            const Icon = page.icon;
            return (
              <button
                key={page.id}
                onClick={() => open(page.path)}
                className={cn(
                  'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                  'text-text-secondary hover:bg-gold/10 hover:text-gold group'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon size={15} />
                  {page.label}
                </div>
                <ExternalLink size={11} className="opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gold/10">
          <p className="text-[9px] text-text-secondary/40 font-mono truncate">{V1_BASE}</p>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-black/10 p-8">
        <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
          <Cpu size={28} className="text-gold" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-display font-semibold text-gold mb-2">MAK OS v1</h2>
          <p className="text-sm text-text-secondary max-w-[280px]">
            Select a section from the sidebar to open it in your browser.
          </p>
        </div>
        <button
          onClick={() => open('')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 hover:bg-gold/20 transition-colors text-[13px] font-medium text-gold"
        >
          <ExternalLink size={14} />
          Open Dashboard
        </button>
      </div>
    </div>
  );
};
