"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// --- Types ---

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  source: string;
  rating: number;
  category: string;
  created_at: string;
}

// --- Helpers ---

function RatingStars({ rating }: { rating: number }) {
  const stars = Math.round(Math.max(0, Math.min(5, rating ?? 0)));
  return (
    <span className="text-gold text-xs tracking-tighter">
      {'★'.repeat(stars)}
      <span className="text-gold/20">{'★'.repeat(5 - stars)}</span>
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-gold/10 text-text-secondary font-mono">
      {source}
    </span>
  );
}

// --- Main Component ---

export const LeadsApp = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('All');

  const fetchLeads = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('scraped_leads')
        .select('id, name, email, phone, city, source, rating, category, created_at')
        .order('created_at', { ascending: false });
      if (data) setLeads(data as Lead[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    const id = setInterval(fetchLeads, 10_000);
    return () => clearInterval(id);
  }, [fetchLeads]);

  // Derived values
  const sources = ['All', ...Array.from(new Set(leads.map((l) => l.source).filter(Boolean)))];

  const filtered = leads.filter((l) => {
    const matchSearch =
      !search ||
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.city?.toLowerCase().includes(search.toLowerCase());
    const matchSource = sourceFilter === 'All' || l.source === sourceFilter;
    return matchSearch && matchSource;
  });

  return (
    <div className="h-full bg-bg-surface/30 text-text-primary flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-gold/10 space-y-3">
        <h1 className="font-display text-gold text-lg font-semibold tracking-wide">Leads</h1>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-gold/20 rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-gold/40"
        />

        {/* Source filter */}
        <div className="flex flex-wrap gap-1.5">
          {sources.map((src) => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={cn(
                'text-[10px] px-2 py-1 rounded border font-mono transition-colors',
                sourceFilter === src
                  ? 'bg-gold/20 border-gold/40 text-gold'
                  : 'bg-white/3 border-gold/10 text-text-secondary hover:border-gold/20'
              )}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Users className="w-10 h-10 text-gold/20" />
            <p className="text-text-secondary text-sm">No leads found.</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-bg-surface/30 backdrop-blur">
              <tr className="border-b border-gold/10">
                <th className="text-left px-4 py-2 text-text-secondary text-xs font-medium">Name</th>
                <th className="text-left px-4 py-2 text-text-secondary text-xs font-medium">City</th>
                <th className="text-left px-4 py-2 text-text-secondary text-xs font-medium">Source</th>
                <th className="text-left px-4 py-2 text-text-secondary text-xs font-medium">Rating</th>
                <th className="text-left px-4 py-2 text-text-secondary text-xs font-medium">Category</th>
                <th className="text-left px-4 py-2 text-text-secondary text-xs font-medium">Email</th>
                <th className="text-left px-4 py-2 text-text-secondary text-xs font-medium">Phone</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-gold/10 hover:bg-white/3 transition-colors"
                >
                  <td className="px-4 py-2 text-text-primary font-medium">{lead.name}</td>
                  <td className="px-4 py-2 text-text-secondary">{lead.city}</td>
                  <td className="px-4 py-2">
                    <SourceBadge source={lead.source} />
                  </td>
                  <td className="px-4 py-2">
                    <RatingStars rating={lead.rating} />
                  </td>
                  <td className="px-4 py-2 text-text-secondary text-xs">{lead.category}</td>
                  <td className="px-4 py-2 text-text-secondary text-xs truncate max-w-[140px]">
                    {lead.email}
                  </td>
                  <td className="px-4 py-2 text-text-secondary text-xs">{lead.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-2 border-t border-gold/10 text-text-secondary text-[10px]">
        {filtered.length} of {leads.length} leads
      </div>
    </div>
  );
};
