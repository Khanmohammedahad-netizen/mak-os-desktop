"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// --- Types ---

interface JobCounts {
  pending: number;
  running: number;
  done: number;
  failed: number;
}

interface OutreachLog {
  id: string;
  channel: string;
  direction: string;
  status: string;
  body: string;
  contact_id: string;
  created_at: string;
}

interface ContactStatusCount {
  status: string;
  count: number;
}

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

const CHANNEL_EMOJI: Record<string, string> = {
  whatsapp: '💬',
  email: '✉️',
  voice: '📞',
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

const StatBox = ({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) => (
  <div className="bg-white/3 rounded-lg p-4 flex flex-col gap-1 border border-gold/10">
    <span className={cn('text-2xl font-display font-bold', colorClass)}>{value}</span>
    <span className="text-text-secondary text-xs uppercase tracking-wider">{label}</span>
  </div>
);

const ActivityRow = ({ log }: { log: OutreachLog }) => {
  const emoji = CHANNEL_EMOJI[log.channel] ?? '📡';
  const statusClass = STATUS_COLORS[log.status] ?? 'bg-white/5 text-text-secondary';
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gold/10 last:border-0">
      <span className="text-lg leading-none">{emoji}</span>
      <span
        className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono font-medium', statusClass)}
      >
        {log.status}
      </span>
      <span className="text-text-primary text-xs flex-1 truncate">{log.body}</span>
      <span className="text-text-secondary text-[10px] shrink-0">{timeAgo(log.created_at)}</span>
    </div>
  );
};

// --- Main Component ---

export const DashboardApp = () => {
  const [jobCounts, setJobCounts] = useState<JobCounts>({ pending: 0, running: 0, done: 0, failed: 0 });
  const [recentLogs, setRecentLogs] = useState<OutreachLog[]>([]);
  const [contactStatuses, setContactStatuses] = useState<ContactStatusCount[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [jobsRes, logsRes, contactsRes] = await Promise.all([
        supabase.from('agent_jobs').select('status'),
        supabase
          .from('outreach_logs')
          .select('id, channel, direction, status, body, contact_id, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('mak_contacts').select('status'),
      ]);

      if (jobsRes.data) {
        const counts: JobCounts = { pending: 0, running: 0, done: 0, failed: 0 };
        for (const job of jobsRes.data) {
          const key = job.status as keyof JobCounts;
          if (key in counts) counts[key]++;
        }
        setJobCounts(counts);
      }

      if (logsRes.data) {
        setRecentLogs(logsRes.data as OutreachLog[]);
      }

      if (contactsRes.data) {
        const map: Record<string, number> = {};
        for (const c of contactsRes.data) {
          map[c.status] = (map[c.status] ?? 0) + 1;
        }
        setContactStatuses(
          Object.entries(map)
            .map(([status, count]) => ({ status, count }))
            .sort((a, b) => b.count - a.count)
        );
      }

      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 10_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  return (
    <div className="h-full bg-bg-surface/30 text-text-primary overflow-y-auto p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-gold text-lg font-semibold tracking-wide">Dashboard</h1>
        <span className="text-text-secondary text-[10px]">
          Last refreshed: {lastRefreshed.toLocaleTimeString()}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
          Loading…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Agent Queue Stats */}
          <section className="space-y-3">
            <h2 className="font-display text-text-secondary text-xs uppercase tracking-wider">
              Agent Queue
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Pending" value={jobCounts.pending} colorClass="text-amber-400" />
              <StatBox label="Running" value={jobCounts.running} colorClass="text-blue-400" />
              <StatBox label="Done" value={jobCounts.done} colorClass="text-green-400" />
              <StatBox label="Failed" value={jobCounts.failed} colorClass="text-red-400" />
            </div>
          </section>

          {/* Contact Summary */}
          <section className="space-y-3">
            <h2 className="font-display text-text-secondary text-xs uppercase tracking-wider">
              Contact Summary
            </h2>
            <div className="bg-white/3 rounded-lg border border-gold/10 p-3 space-y-1.5">
              {contactStatuses.length === 0 ? (
                <p className="text-text-secondary text-xs">No contacts yet.</p>
              ) : (
                contactStatuses.map(({ status, count }) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-text-primary text-xs capitalize">
                      {status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-gold font-mono text-xs font-semibold">{count}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Recent Activity — spans full width */}
          <section className="md:col-span-2 space-y-3">
            <h2 className="font-display text-text-secondary text-xs uppercase tracking-wider">
              Recent Activity
            </h2>
            <div className="bg-white/3 rounded-lg border border-gold/10 p-3">
              {recentLogs.length === 0 ? (
                <p className="text-text-secondary text-xs">No recent activity.</p>
              ) : (
                recentLogs.map((log) => <ActivityRow key={log.id} log={log} />)
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
