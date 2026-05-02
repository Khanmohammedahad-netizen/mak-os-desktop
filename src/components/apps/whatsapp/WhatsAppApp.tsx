"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// --- Types ---

interface OutreachLog {
  id: string;
  channel: string;
  direction: string;
  status: string;
  body: string;
  contact_id: string;
  created_at: string;
}

type Tab = 'outbound' | 'inbound';

// --- Helpers ---

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function truncateId(id: string): string {
  if (!id) return '—';
  return id.slice(0, 8) + '…';
}

const DIRECTION_BADGE: Record<string, string> = {
  outbound: 'bg-blue-500/20 text-blue-400',
  inbound: 'bg-purple-500/20 text-purple-400',
};

const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-blue-500/20 text-blue-400',
  delivered: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
  pending: 'bg-amber-500/20 text-amber-400',
  received: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-green-500/20 text-green-400',
};

// --- Sub-components ---

const LogRow = ({ log }: { log: OutreachLog }) => {
  const dirClass = DIRECTION_BADGE[log.direction] ?? 'bg-white/5 text-text-secondary';
  const statusClass = STATUS_COLORS[log.status] ?? 'bg-white/5 text-text-secondary';

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gold/10 hover:bg-white/3 transition-colors last:border-0">
      <span className="text-lg leading-none mt-0.5">💬</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-text-secondary font-mono text-[10px]">
            {truncateId(log.contact_id)}
          </span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', dirClass)}>
            {log.direction}
          </span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', statusClass)}>
            {log.status}
          </span>
          <span className="text-text-secondary text-[10px] ml-auto shrink-0">
            {timeAgo(log.created_at)}
          </span>
        </div>
        <p className="text-text-primary text-xs mt-1 line-clamp-2 leading-relaxed">{log.body}</p>
      </div>
    </div>
  );
};

// --- Main Component ---

export const WhatsAppApp = () => {
  const [logs, setLogs] = useState<OutreachLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('outbound');

  const fetchLogs = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('outreach_logs')
        .select('id, channel, direction, status, body, contact_id, created_at')
        .eq('channel', 'whatsapp')
        .order('created_at', { ascending: false });
      if (data) setLogs(data as OutreachLog[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 10_000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  const filtered = logs.filter((l) => l.direction === tab);

  return (
    <div className="h-full bg-bg-surface/30 text-text-primary flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-gold/10">
        <h1 className="font-display text-gold text-lg font-semibold tracking-wide">WhatsApp</h1>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-gold/10">
        {(['outbound', 'inbound'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 text-sm capitalize font-medium transition-colors',
              tab === t
                ? 'text-gold border-b-2 border-gold -mb-px'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <MessageSquare className="w-10 h-10 text-gold/20" />
            <p className="text-text-secondary text-sm">No {tab} messages.</p>
          </div>
        ) : (
          filtered.map((log) => <LogRow key={log.id} log={log} />)
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-2 border-t border-gold/10 text-text-secondary text-[10px]">
        {filtered.length} message{filtered.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};
