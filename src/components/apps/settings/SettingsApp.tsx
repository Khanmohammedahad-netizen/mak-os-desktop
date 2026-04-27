"use client";

import React, { useState } from 'react';
import {
  Settings, Link, Info, Database, ChevronLeft,
  Check, Circle, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { useCRMStore } from '@/stores/crmStore';
import { useDealsStore } from '@/stores/dealsStore';
import { useNotesStore } from '@/stores/notesStore';
import { useTasksStore } from '@/stores/tasksStore';

type CategoryId = 'general' | 'integrations' | 'about' | 'data';

const CATEGORIES = [
  { id: 'general' as const, label: 'General', icon: Settings, sub: 'Wallpaper & dock' },
  { id: 'integrations' as const, label: 'Integrations', icon: Link, sub: 'Connected services' },
  { id: 'about' as const, label: 'About', icon: Info, sub: 'MAK OS Desktop v1.0' },
  { id: 'data' as const, label: 'Data', icon: Database, sub: 'Export & import' },
];

const WALLPAPERS = [
  { id: 'dark', label: 'Midnight', style: { background: 'linear-gradient(135deg, #0A0A0F 0%, #111118 100%)' } },
  { id: 'aurora', label: 'Aurora', style: { background: 'linear-gradient(135deg, #0A0A1A 0%, #0D1A0A 50%, #1A0A0D 100%)' } },
  { id: 'gold', label: 'Ember', style: { background: 'linear-gradient(135deg, #0D0D00 0%, #1A1000 60%, #0A0800 100%)' } },
];

const INTEGRATIONS = [
  { name: 'Supabase', sub: 'Database backend', connected: true },
  { name: 'MAK OS v1', sub: 'Autonomous engine', connected: true },
  { name: 'Twilio', sub: 'Voice & SMS', connected: false },
  { name: 'Brevo', sub: 'Email marketing', connected: false },
];

const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={cn('relative w-10 h-5 rounded-full transition-all', enabled ? 'bg-gold' : 'bg-white/10')}
  >
    <div className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', enabled && 'translate-x-5')} />
  </button>
);

export const SettingsApp = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [wallpaper, setWallpaper] = useState('dark');
  const [dockMag, setDockMag] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

  const { contacts } = useCRMStore();
  const { deals } = useDealsStore();
  const { notes } = useNotesStore();
  const { tasks } = useTasksStore();
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  const handleExport = async () => {
    setExporting(true);
    try {
      let data: Record<string, unknown>;
      if (isMock) {
        data = { contacts, deals, notes, tasks, exportedAt: new Date().toISOString() };
      } else {
        const [cRes, dRes, nRes, tRes] = await Promise.all([
          fetch('/api/contacts'), fetch('/api/deals'),
          fetch('/api/notes'), fetch('/api/tasks'),
        ]);
        data = {
          contacts: await cRes.json(),
          deals: await dRes.json(),
          notes: await nRes.json(),
          tasks: await tRes.json(),
          exportedAt: new Date().toISOString(),
        };
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mak-os-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportDone(true);
      setTimeout(() => setExportDone(false), 3000);
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  // ── Main grid ──────────────────────────────────────────────────────────────
  if (!activeCategory) {
    return (
      <div className="flex flex-col h-full bg-bg-surface/20 p-6">
        <h2 className="text-base font-display font-semibold text-gold mb-6">System Preferences</h2>
        <div className="grid grid-cols-2 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border border-gold/10 bg-white/3 hover:border-gold/30 hover:bg-white/6 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                  <Icon size={26} className="text-gold" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-text-primary">{cat.label}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">{cat.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-6 text-center">
          <p className="text-[10px] text-text-secondary/30">MAK OS Desktop v1.0</p>
        </div>
      </div>
    );
  }

  // ── Detail views ───────────────────────────────────────────────────────────
  const BackBtn = () => (
    <button
      onClick={() => setActiveCategory(null)}
      className="flex items-center gap-2 text-[12px] text-text-secondary hover:text-gold transition-colors mb-6"
    >
      <ChevronLeft size={14} />
      Preferences
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-bg-surface/20 overflow-auto p-6">
      <BackBtn />

      {activeCategory === 'general' && (
        <div className="max-w-lg space-y-6">
          <h2 className="text-xl font-display font-semibold text-gold">General</h2>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">Wallpaper</p>
            <div className="flex gap-3">
              {WALLPAPERS.map((wp) => (
                <button
                  key={wp.id}
                  onClick={() => setWallpaper(wp.id)}
                  className={cn(
                    'relative w-24 h-16 rounded-xl border-2 overflow-hidden transition-all',
                    wallpaper === wp.id ? 'border-gold' : 'border-gold/10 hover:border-gold/30'
                  )}
                  style={wp.style}
                >
                  {wallpaper === wp.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Check size={16} className="text-gold" />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-white/60">{wp.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="glass border border-gold/10 rounded-2xl p-5 divide-y divide-gold/5">
            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-text-primary">Dock Magnification</p>
                <p className="text-xs text-text-secondary mt-0.5">Scale icons on hover</p>
              </div>
              <Toggle enabled={dockMag} onChange={() => setDockMag(!dockMag)} />
            </div>
            <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-text-primary">Window Animations</p>
                <p className="text-xs text-text-secondary mt-0.5">Framer Motion transitions</p>
              </div>
              <Toggle enabled={true} onChange={() => {}} />
            </div>
          </div>
        </div>
      )}

      {activeCategory === 'integrations' && (
        <div className="max-w-lg space-y-6">
          <h2 className="text-xl font-display font-semibold text-gold">Integrations</h2>

          <div className="space-y-3">
            {INTEGRATIONS.map((intg) => (
              <div
                key={intg.name}
                className="flex items-center justify-between p-4 glass border border-gold/10 rounded-xl"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{intg.name}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{intg.sub}</p>
                </div>
                {intg.connected ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] font-bold text-green-400">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-gold/10">
                    <Circle size={8} className="text-text-secondary" />
                    <span className="text-[10px] text-text-secondary">Not configured</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-[11px] text-text-secondary/50">
            Configure Twilio and Brevo via environment variables in your deployment settings.
          </p>
        </div>
      )}

      {activeCategory === 'about' && (
        <div className="max-w-lg space-y-6">
          <h2 className="text-xl font-display font-semibold text-gold">About MAK OS</h2>

          <div className="flex items-center gap-6 p-6 glass border border-gold/20 rounded-2xl">
            <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-display font-bold text-gold">M</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">MAK OS Desktop</h3>
              <p className="text-text-secondary text-sm">Version 1.0.0</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {['Next.js 16', 'TypeScript', 'Supabase', 'Recharts'].map((t) => (
                  <span key={t} className="text-[10px] font-bold text-gold/70 bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="glass border border-gold/10 rounded-2xl p-5 divide-y divide-gold/5">
            {[
              ['Built by', 'MAK Software Solutions'],
              ['Founder', 'Mohammed Ahad Khan'],
              ['Email', 'Khanmohammedahad@yahoo.com'],
              ['System', 'MAK OS Desktop v1.0'],
              ['Build date', new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-sm text-text-secondary">{label}</span>
                <span className="text-sm font-medium text-text-primary">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCategory === 'data' && (
        <div className="max-w-lg space-y-6">
          <h2 className="text-xl font-display font-semibold text-gold">Data</h2>

          <div className="glass border border-gold/10 rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-text-primary">Export All Data</p>
              <p className="text-xs text-text-secondary mt-1">Download all contacts, deals, notes, and tasks as a JSON file.</p>
            </div>
            <Button
              onClick={handleExport}
              disabled={exporting}
              className="space-x-2"
            >
              {exportDone ? (
                <>
                  <Check size={14} />
                  <span>Exported!</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>{exporting ? 'Exporting…' : 'Export JSON'}</span>
                </>
              )}
            </Button>
          </div>

          <div className="glass border border-gold/10 rounded-2xl p-5 space-y-4 opacity-50">
            <div>
              <p className="text-sm font-semibold text-text-primary">Import Data</p>
              <p className="text-xs text-text-secondary mt-1">Import from a MAK OS JSON export file.</p>
            </div>
            <Button variant="secondary" disabled className="space-x-2">
              <span>Import JSON</span>
              <span className="text-[10px] text-text-secondary ml-2">(coming soon)</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
