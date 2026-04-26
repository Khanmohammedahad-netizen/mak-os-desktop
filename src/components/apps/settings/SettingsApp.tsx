"use client";

import React, { useState } from 'react';
import {
  User, Palette, Database, Bell, Shield,
  Globe, Monitor, ChevronRight, Check, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'display', label: 'Display', icon: Monitor },
];

type SectionId = typeof SECTIONS[number]['id'];

interface ToggleProps {
  enabled: boolean;
  onChange: () => void;
}

const Toggle = ({ enabled, onChange }: ToggleProps) => (
  <button
    onClick={onChange}
    className={cn(
      'relative w-10 h-5 rounded-full transition-all duration-300 focus:outline-none',
      enabled ? 'bg-gold' : 'bg-white/10'
    )}
  >
    <div className={cn(
      'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300',
      enabled && 'translate-x-5'
    )} />
  </button>
);

const SettingRow = ({
  label,
  description,
  action,
}: {
  label: string;
  description?: string;
  action: React.ReactNode;
}) => (
  <div className="flex items-center justify-between py-4 border-b border-gold/5 last:border-0">
    <div>
      <p className="text-sm font-medium text-text-primary">{label}</p>
      {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
    </div>
    {action}
  </div>
);

export const SettingsApp = () => {
  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [notifications, setNotifications] = useState({ email: true, desktop: false, sounds: true });
  const [supabaseUrl, setSupabaseUrl] = useState(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  const [supabaseKey, setSupabaseKey] = useState('');

  return (
    <div className="flex h-full bg-bg-surface/20">
      {/* Sidebar */}
      <div className="w-56 border-r border-gold/10 bg-black/20 py-4">
        <div className="px-4 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">System Preferences</p>
        </div>
        <nav className="space-y-0.5 px-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all',
                activeSection === s.id
                  ? 'bg-gold/15 text-gold'
                  : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
              )}
            >
              <s.icon size={15} />
              <span>{s.label}</span>
              {activeSection === s.id && <ChevronRight size={12} className="ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Version Info */}
        <div className="mt-auto px-4 pt-8 pb-2">
          <p className="text-[10px] text-text-secondary/40">MAK OS Desktop</p>
          <p className="text-[10px] text-text-secondary/40">Version 2.0.0</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {activeSection === 'profile' && (
          <div className="max-w-lg space-y-8">
            <div>
              <h2 className="text-xl font-display font-semibold text-gold mb-1">Profile</h2>
              <p className="text-text-secondary text-sm">Your MAK OS identity and account info</p>
            </div>

            <div className="flex items-center space-x-6 p-6 glass border border-gold/20 rounded-2xl">
              <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center">
                <span className="text-3xl font-display font-bold text-gold">M</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">MAK Admin</h3>
                <p className="text-text-secondary text-sm">Khanmohammedahad@yahoo.com</p>
                <span className="mt-2 inline-block text-[10px] font-bold text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Founder
                </span>
              </div>
            </div>

            <div className="glass border border-gold/10 rounded-2xl p-6 divide-y divide-gold/5">
              <SettingRow
                label="Display Name"
                description="Shown throughout MAK OS"
                action={
                  <input
                    defaultValue="MAK Admin"
                    className="bg-white/5 border border-gold/10 rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50 w-40"
                  />
                }
              />
              <SettingRow
                label="Email"
                description="Your primary contact email"
                action={
                  <input
                    defaultValue="Khanmohammedahad@yahoo.com"
                    className="bg-white/5 border border-gold/10 rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50 w-56"
                  />
                }
              />
              <SettingRow
                label="Company"
                description="Your organization name"
                action={
                  <input
                    defaultValue="MAK Software Solutions"
                    className="bg-white/5 border border-gold/10 rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50 w-48"
                  />
                }
              />
            </div>

            <Button className="w-full">Save Profile</Button>
          </div>
        )}

        {activeSection === 'database' && (
          <div className="max-w-lg space-y-8">
            <div>
              <h2 className="text-xl font-display font-semibold text-gold mb-1">Database Connection</h2>
              <p className="text-text-secondary text-sm">Configure your Supabase backend</p>
            </div>

            <div className="glass border border-gold/20 rounded-2xl p-6 space-y-5">
              <div className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(40,200,64,0.8)]" />
                <p className="text-sm text-green-400 font-medium">Supabase configured via environment variables</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">Supabase URL</label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">Anon Key</label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJ..."
                    className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50 font-mono"
                  />
                  <p className="text-[10px] text-text-secondary/60">Set via NEXT_PUBLIC_SUPABASE_ANON_KEY env var</p>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <Button variant="secondary" className="flex-1">Test Connection</Button>
                <Button className="flex-1">Save Settings</Button>
              </div>
            </div>

            <div className="glass border border-gold/10 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-text-primary mb-3">Database Tables</h3>
              <div className="space-y-2">
                {['mak_contacts', 'mak_deals', 'mak_notes', 'mak_tasks', 'mak_activity_log'].map(table => (
                  <div key={table} className="flex items-center justify-between py-2 border-b border-gold/5 last:border-0">
                    <span className="text-sm font-mono text-text-secondary">{table}</span>
                    <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'notifications' && (
          <div className="max-w-lg space-y-8">
            <div>
              <h2 className="text-xl font-display font-semibold text-gold mb-1">Notifications</h2>
              <p className="text-text-secondary text-sm">Control how MAK OS notifies you</p>
            </div>
            <div className="glass border border-gold/10 rounded-2xl p-6 divide-y divide-gold/5">
              <SettingRow
                label="Email Notifications"
                description="Receive updates via email"
                action={<Toggle enabled={notifications.email} onChange={() => setNotifications(n => ({ ...n, email: !n.email }))} />}
              />
              <SettingRow
                label="Desktop Notifications"
                description="Browser push notifications"
                action={<Toggle enabled={notifications.desktop} onChange={() => setNotifications(n => ({ ...n, desktop: !n.desktop }))} />}
              />
              <SettingRow
                label="Sound Effects"
                description="UI sound feedback"
                action={<Toggle enabled={notifications.sounds} onChange={() => setNotifications(n => ({ ...n, sounds: !n.sounds }))} />}
              />
              <SettingRow
                label="Deal Reminders"
                description="Alerts for deals approaching close date"
                action={<Toggle enabled={true} onChange={() => {}} />}
              />
            </div>
          </div>
        )}

        {activeSection === 'appearance' && (
          <div className="max-w-lg space-y-8">
            <div>
              <h2 className="text-xl font-display font-semibold text-gold mb-1">Appearance</h2>
              <p className="text-text-secondary text-sm">Customize the look of MAK OS</p>
            </div>
            <div className="glass border border-gold/10 rounded-2xl p-6 space-y-6">
              <div>
                <p className="text-sm font-semibold text-text-primary mb-3">Accent Color</p>
                <div className="flex items-center space-x-3">
                  {['#C9A84C', '#4A9EFF', '#28C840', '#A855F7', '#FF5F57'].map((color) => (
                    <button
                      key={color}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        color === '#C9A84C' ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <SettingRow
                label="Dock Magnification"
                description="Scale dock icons on hover"
                action={<Toggle enabled={true} onChange={() => {}} />}
              />
              <SettingRow
                label="Window Animations"
                description="Framer Motion window transitions"
                action={<Toggle enabled={true} onChange={() => {}} />}
              />
              <SettingRow
                label="Reduced Motion"
                description="Minimize animations for accessibility"
                action={<Toggle enabled={false} onChange={() => {}} />}
              />
            </div>
          </div>
        )}

        {(activeSection === 'security' || activeSection === 'integrations' || activeSection === 'display') && (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-16 h-16 bg-gold/5 rounded-2xl border border-gold/10 flex items-center justify-center">
              <span className="text-gold text-2xl font-bold">M</span>
            </div>
            <h3 className="text-lg font-display font-semibold text-gold capitalize">{activeSection} Settings</h3>
            <p className="text-text-secondary text-sm">This section is coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};
