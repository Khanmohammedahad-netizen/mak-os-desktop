"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// --- Types ---

interface Contact {
  id: string;
  name: string;
  email: string;
  status: string;
  metadata: { score?: number } | null;
}

// --- Constants ---

const PIPELINE_STATUSES = [
  'new',
  'enriched',
  'qualified',
  'outreach_sent',
  'replied',
  'meeting_booked',
  'closed',
] as const;

type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

const STATUS_LABELS: Record<PipelineStatus, string> = {
  new: 'New',
  enriched: 'Enriched',
  qualified: 'Qualified',
  outreach_sent: 'Outreach Sent',
  replied: 'Replied',
  meeting_booked: 'Meeting Booked',
  closed: 'Closed',
};

const STATUS_ACCENT: Record<PipelineStatus, string> = {
  new: 'border-slate-500/30 text-slate-400',
  enriched: 'border-blue-500/30 text-blue-400',
  qualified: 'border-indigo-500/30 text-indigo-400',
  outreach_sent: 'border-amber-500/30 text-amber-400',
  replied: 'border-purple-500/30 text-purple-400',
  meeting_booked: 'border-green-500/30 text-green-400',
  closed: 'border-gold/30 text-gold',
};

// --- Sub-components ---

const ContactCard = ({ contact }: { contact: Contact }) => {
  const score = contact.metadata?.score;
  return (
    <div className="bg-white/3 border border-gold/10 rounded-md p-2.5 space-y-1 hover:border-gold/20 transition-colors">
      <p className="text-text-primary text-xs font-medium leading-tight line-clamp-1">
        {contact.name || '(unnamed)'}
      </p>
      {contact.email && (
        <p className="text-text-secondary text-[10px] truncate">{contact.email}</p>
      )}
      {score !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-text-secondary text-[10px]">Score:</span>
          <span className="text-gold text-[10px] font-mono font-semibold">{score}</span>
        </div>
      )}
    </div>
  );
};

const KanbanColumn = ({
  status,
  contacts,
}: {
  status: PipelineStatus;
  contacts: Contact[];
}) => {
  const accentClass = STATUS_ACCENT[status];
  return (
    <div className="flex flex-col shrink-0 w-48 h-full">
      {/* Column header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 border-b mb-2',
          accentClass
        )}
      >
        <span className="text-[11px] font-medium uppercase tracking-wider">
          {STATUS_LABELS[status]}
        </span>
        <span className="text-[10px] font-mono bg-white/5 rounded px-1.5 py-0.5">
          {contacts.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto space-y-2 px-1 pb-2">
        {contacts.length === 0 ? (
          <p className="text-text-secondary text-[10px] text-center mt-4">Empty</p>
        ) : (
          contacts.map((c) => <ContactCard key={c.id} contact={c} />)
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

export const PipelineApp = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('mak_contacts')
        .select('id, name, email, status, metadata')
        .order('created_at', { ascending: false });
      if (data) setContacts(data as Contact[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
    const id = setInterval(fetchContacts, 10_000);
    return () => clearInterval(id);
  }, [fetchContacts]);

  // Group contacts by status
  const grouped = PIPELINE_STATUSES.reduce<Record<PipelineStatus, Contact[]>>(
    (acc, s) => ({ ...acc, [s]: [] }),
    {} as Record<PipelineStatus, Contact[]>
  );
  for (const c of contacts) {
    const key = c.status as PipelineStatus;
    if (key in grouped) grouped[key].push(c);
  }

  return (
    <div className="h-full bg-bg-surface/30 text-text-primary flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-gold/10 flex items-center justify-between">
        <h1 className="font-display text-gold text-lg font-semibold tracking-wide">Pipeline</h1>
        <span className="text-text-secondary text-[10px]">{contacts.length} total contacts</span>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
          Loading…
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full p-4 min-w-max">
            {PIPELINE_STATUSES.map((status) => (
              <KanbanColumn key={status} status={status} contacts={grouped[status]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
