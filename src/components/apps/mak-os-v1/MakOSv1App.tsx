"use client";

import React, { useState } from 'react';
import {
  Cpu, LayoutDashboard, Users, Send, MessageCircle,
  Mail, Phone, Columns, Settings, ExternalLink,
  RefreshCw, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const V1_BASE = 'https://mak-os.onrender.com';

const PAGES = [
  { id: 'dashboard',   label: 'Dashboard',   path: '',             icon: LayoutDashboard },
  { id: 'leads',       label: 'Leads',        path: '/leads',       icon: Users },
  { id: 'outreach',    label: 'Outreach',     path: '/outreach',    icon: Send },
  { id: 'whatsapp',    label: 'WhatsApp',     path: '/whatsapp',    icon: MessageCircle },
  { id: 'email',       label: 'Email',        path: '/email',       icon: Mail },
  { id: 'voice',       label: 'Voice Calls',  path: '/voice-calls', icon: Phone },
  { id: 'pipeline',    label: 'Pipeline',     path: '/pipeline',    icon: Columns },
  { id: 'settings',    label: 'Settings',     path: '/settings',    icon: Settings },
];

export const MakOSv1App = () => {
  const [activePage, setActivePage] = useState(PAGES[0]);
  const [loading, setLoading] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const iframeUrl = `${V1_BASE}${activePage.path}`;

  const refresh = () => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-[220px] flex-shrink-0 flex flex-col bg-[#0D0D0F] border-r border-gold/10">
        {/* Sidebar header */}
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
          {/* LIVE badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">Live System</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-auto">
          {PAGES.map((page) => {
            const Icon = page.icon;
            const isActive = activePage.id === page.id;
            return (
              <button
                key={page.id}
                onClick={() => { setActivePage(page); setLoading(true); setShowFallback(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                  isActive
                    ? 'bg-gold/15 text-gold border border-gold/20'
                    : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                )}
              >
                <Icon size={15} className={isActive ? 'text-gold' : ''} />
                {page.label}
              </button>
            );
          })}
        </nav>

        {/* Base URL */}
        <div className="p-3 border-t border-gold/10">
          <p className="text-[9px] text-text-secondary/40 font-mono truncate">{V1_BASE}</p>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gold/10 bg-white/3 flex-shrink-0">
          <button
            onClick={refresh}
            className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary transition-colors"
          >
            <RefreshCw size={13} className={cn(loading && 'animate-spin')} />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-white/5 border border-gold/10 rounded-lg px-3 py-1.5">
            <Globe size={11} className="text-text-secondary flex-shrink-0" />
            <span className="text-xs font-mono text-text-secondary truncate">{iframeUrl}</span>
          </div>
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary hover:text-gold transition-colors"
            title="Open in browser"
          >
            <ExternalLink size={13} />
          </a>
          <button
            onClick={() => setShowFallback((s) => !s)}
            className="text-[10px] text-text-secondary/50 hover:text-gold transition-colors px-2 py-1 rounded border border-gold/10 hover:border-gold/30"
          >
            {showFallback ? 'Try Embed' : 'Open Links'}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {!showFallback ? (
            <>
              <iframe
                key={`${activePage.id}-${refreshKey}`}
                src={iframeUrl}
                className="w-full h-full border-0"
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setShowFallback(true); }}
                title={`MAK OS v1 — ${activePage.label}`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
              {loading && (
                <div className="absolute inset-0 bg-bg-primary/80 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                  <p className="text-[12px] text-text-secondary">Loading {activePage.label}…</p>
                </div>
              )}
            </>
          ) : (
            /* Fallback card grid */
            <div className="h-full overflow-auto p-8">
              <div className="mb-6">
                <h2 className="text-xl font-display font-semibold text-gold">MAK OS v1 — Autonomous Engine</h2>
                <p className="text-text-secondary text-sm mt-1">Iframe blocked. Open pages directly in browser.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                {PAGES.map((page) => {
                  const Icon = page.icon;
                  return (
                    <a
                      key={page.id}
                      href={`${V1_BASE}${page.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 rounded-2xl border border-gold/10 bg-white/3 hover:border-gold/30 hover:bg-white/5 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20 group-hover:bg-gold/20 transition-colors flex-shrink-0">
                        <Icon size={18} className="text-gold" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-text-primary">{page.label}</p>
                        <p className="text-[11px] text-text-secondary font-mono">{V1_BASE}{page.path || '/'}</p>
                      </div>
                      <ExternalLink size={12} className="text-text-secondary/30 ml-auto flex-shrink-0 group-hover:text-gold/60 transition-colors" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
