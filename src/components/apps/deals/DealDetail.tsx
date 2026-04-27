"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Edit2, Trash2, Clock, MessageSquare, Save,
  ChevronDown, Calendar, DollarSign, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { Deal, ActivityLog } from '@/types';
import { useDealsStore } from '@/stores/dealsStore';
import { useToastStore } from '@/stores/toastStore';

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  qualified: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  proposal: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  negotiation: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'closed won': 'bg-green-500/20 text-green-400 border-green-500/30',
  'closed lost': 'bg-red-500/20 text-red-400 border-red-500/30',
};

const probColor = (p: number) => {
  if (p < 30) return 'text-red-400';
  if (p <= 60) return 'text-yellow-400';
  return 'text-green-400';
};

const fmt = (val: number | null, currency = 'USD') => {
  if (!val) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val);
  } catch {
    return `${currency} ${val.toLocaleString()}`;
  }
};

interface DealWithContact extends Deal {
  contact?: { id: string; name: string; company?: string | null; email?: string | null } | null;
}

interface DealDetailProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string | null;
  onEdit: (deal: Deal) => void;
}

export const DealDetail = ({ isOpen, onClose, dealId, onEdit }: DealDetailProps) => {
  const [deal, setDeal] = useState<DealWithContact | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [stageDropOpen, setStageDropOpen] = useState(false);
  const [changingStage, setChangingStage] = useState(false);
  const { deals, updateDeal, removeDeal } = useDealsStore();
  const { toast } = useToastStore();
  const dropRef = useRef<HTMLDivElement>(null);
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  useEffect(() => {
    if (!dealId || !isOpen) return;
    setEditingNotes(false);
    setStageDropOpen(false);

    if (isMock) {
      const local = deals.find((d) => d.id === dealId);
      if (local) {
        setDeal(local as DealWithContact);
        setNotesValue(local.notes ?? '');
      }
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [dealRes, activityRes] = await Promise.all([
          fetch(`/api/deals/${dealId}`),
          fetch(`/api/activity?entity_type=deal&entity_id=${dealId}`),
        ]);
        const dealData = await dealRes.json();
        const activityData = await activityRes.json();
        setDeal(dealData);
        setNotesValue(dealData.notes ?? '');
        setActivities(Array.isArray(activityData) ? activityData : []);
      } catch (err) {
        console.error('Failed to fetch deal:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dealId, isOpen, isMock, deals]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setStageDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleStageChange = async (stage: string) => {
    if (!deal) return;
    setStageDropOpen(false);
    setChangingStage(true);
    updateDeal(deal.id, { stage });
    setDeal((d) => (d ? { ...d, stage } : d));
    if (!isMock) {
      try {
        await fetch(`/api/deals/${deal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage }),
        });
      } catch {
        toast('Failed to update stage', 'error');
      }
    }
    toast(`Stage → ${stage}`);
    setChangingStage(false);
  };

  const handleSaveNotes = async () => {
    if (!deal) return;
    setSavingNotes(true);
    updateDeal(deal.id, { notes: notesValue });
    setDeal((d) => (d ? { ...d, notes: notesValue } : d));
    setEditingNotes(false);
    if (!isMock) {
      try {
        await fetch(`/api/deals/${deal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: notesValue }),
        });
      } catch {
        toast('Failed to save notes', 'error');
      }
    }
    toast('Notes saved');
    setSavingNotes(false);
  };

  const handleDelete = async () => {
    if (!deal) return;
    if (!confirm(`Delete "${deal.title}"? This cannot be undone.`)) return;
    if (!isMock) {
      try {
        await fetch(`/api/deals/${deal.id}`, { method: 'DELETE' });
      } catch {
        toast('Failed to delete', 'error');
        return;
      }
    }
    removeDeal(deal.id);
    toast(`"${deal.title}" deleted`);
    onClose();
  };

  const stageColor = deal
    ? (STAGE_COLORS[deal.stage.toLowerCase()] ?? 'bg-gold/10 text-gold border-gold/20')
    : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute top-0 right-0 w-[400px] h-full bg-bg-surface glass border-l border-gold/20 z-[50] flex flex-col shadow-2xl"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : deal ? (
            <>
              <div className="p-6 border-b border-gold/10 flex-shrink-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20">
                    <DollarSign className="text-gold" size={20} />
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(deal)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/10" onClick={handleDelete}>
                      <Trash2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                      <X size={18} />
                    </Button>
                  </div>
                </div>
                <h2 className="text-xl font-display font-semibold text-text-primary tracking-tight leading-tight">
                  {deal.title}
                </h2>
                {deal.contact && (
                  <p className="text-text-secondary text-sm mt-1">
                    {deal.contact.name}
                    {deal.contact.company ? ` · ${deal.contact.company}` : ''}
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-6">
                {/* Value + Probability */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-white/5 rounded-xl border border-gold/10">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold mb-1">Deal Value</p>
                    <span className="text-gold font-bold text-lg">{fmt(deal.value, deal.currency)}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-gold/10">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold mb-1">Probability</p>
                    <span className={cn('font-bold text-lg', probColor(deal.probability))}>
                      {deal.probability}%
                    </span>
                  </div>
                </div>

                {/* Stage + Close Date */}
                <div className="flex items-start justify-between p-4 bg-white/5 rounded-xl border border-gold/10 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">Stage</p>
                    <div className="relative" ref={dropRef}>
                      <button
                        onClick={() => setStageDropOpen((o) => !o)}
                        disabled={changingStage}
                        className={cn(
                          'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all',
                          stageColor
                        )}
                      >
                        <span>{deal.stage}</span>
                        <ChevronDown size={10} />
                      </button>
                      {stageDropOpen && (
                        <div className="absolute top-full left-0 mt-1 w-40 glass border border-gold/20 rounded-xl shadow-2xl z-20 overflow-hidden">
                          {STAGES.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStageChange(s)}
                              className={cn(
                                'w-full text-left px-4 py-2 text-[12px] hover:bg-white/10 transition-colors',
                                deal.stage === s ? 'text-gold font-semibold' : 'text-text-primary'
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {deal.expected_close_date && (
                    <div className="text-right space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">Close Date</p>
                      <div className="flex items-center justify-end space-x-1 text-sm text-text-primary">
                        <Calendar size={12} className="text-text-secondary" />
                        <span>
                          {new Date(deal.expected_close_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Linked Contact */}
                {deal.contact && (
                  <div className="space-y-2">
                    <h3 className="text-[11px] uppercase tracking-wider text-text-secondary font-bold flex items-center space-x-2">
                      <User size={12} />
                      <span>Linked Contact</span>
                    </h3>
                    <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl border border-gold/10">
                      <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center border border-gold/20 text-gold text-sm font-bold flex-shrink-0">
                        {deal.contact.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-text-primary truncate">{deal.contact.name}</p>
                        {deal.contact.company && (
                          <p className="text-[11px] text-text-secondary truncate">{deal.contact.company}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] uppercase tracking-wider text-text-secondary font-bold flex items-center space-x-2">
                      <MessageSquare size={12} />
                      <span>Notes</span>
                    </h3>
                    {!editingNotes ? (
                      <button
                        onClick={() => setEditingNotes(true)}
                        className="text-[11px] text-gold/60 hover:text-gold transition-colors"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => { setEditingNotes(false); setNotesValue(deal.notes ?? ''); }}
                          className="text-[11px] text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveNotes}
                          disabled={savingNotes}
                          className="flex items-center space-x-1 text-[11px] text-gold hover:text-gold/80 transition-colors"
                        >
                          <Save size={11} />
                          <span>{savingNotes ? 'Saving…' : 'Save'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {editingNotes ? (
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      className="w-full h-28 bg-white/5 border border-gold/20 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none transition-all"
                      autoFocus
                    />
                  ) : (
                    <div className="p-4 bg-white/5 rounded-xl border border-gold/5 text-sm text-text-secondary leading-relaxed min-h-[72px]">
                      {deal.notes || 'No notes. Click Edit to add some.'}
                    </div>
                  )}
                </div>

                {/* Activity Feed */}
                {!isMock && (
                  <div className="space-y-3">
                    <h3 className="text-[11px] uppercase tracking-wider text-text-secondary font-bold flex items-center space-x-2">
                      <Clock size={12} />
                      <span>Recent Activity</span>
                    </h3>
                    <div className="space-y-3">
                      {activities.length > 0 ? (
                        activities.slice(0, 8).map((a) => (
                          <div key={a.id} className="flex space-x-3">
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-gold/40 shadow-[0_0_5px_rgba(201,168,76,0.5)] flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-[12px] text-text-primary capitalize">
                                <span className="font-medium">{a.action}</span> deal
                              </p>
                              <p className="text-[10px] text-text-secondary">
                                {new Date(a.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-text-secondary italic">No recent activity.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
