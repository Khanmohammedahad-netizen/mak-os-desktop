"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Handshake, FileText, CheckSquare, X } from 'lucide-react';
import { useCRMStore } from '@/stores/crmStore';
import { useDealsStore } from '@/stores/dealsStore';
import { useNotesStore } from '@/stores/notesStore';
import { useTasksStore } from '@/stores/tasksStore';
import { useWindowStore } from '@/stores/windowStore';

interface SpotlightResult {
  id: string;
  type: 'contact' | 'deal' | 'note' | 'task';
  title: string;
  sub: string;
  appId: string;
  appTitle: string;
}

interface SpotlightProps {
  open: boolean;
  onClose: () => void;
}

const TYPE_META = {
  contact: { icon: Users,       label: 'Contacts', appId: 'crm',    appTitle: 'CRM — MAK OS' },
  deal:    { icon: Handshake,   label: 'Deals',    appId: 'deals',  appTitle: 'Deals — MAK OS' },
  note:    { icon: FileText,    label: 'Notes',    appId: 'notes',  appTitle: 'Notes — MAK OS' },
  task:    { icon: CheckSquare, label: 'Tasks',    appId: 'tasks',  appTitle: 'Tasks — MAK OS' },
};

const TYPE_ORDER: SpotlightResult['type'][] = ['contact', 'deal', 'note', 'task'];

export const Spotlight = ({ open, onClose }: SpotlightProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotlightResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { contacts } = useCRMStore();
  const { deals } = useDealsStore();
  const { notes } = useNotesStore();
  const { tasks } = useTasksStore();
  const { openWindow } = useWindowStore();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const lq = q.toLowerCase();
    const found: SpotlightResult[] = [];

    contacts
      .filter((c) =>
        c.name.toLowerCase().includes(lq) ||
        (c.email ?? '').toLowerCase().includes(lq) ||
        (c.company ?? '').toLowerCase().includes(lq)
      )
      .slice(0, 4)
      .forEach((c) =>
        found.push({
          id: c.id, type: 'contact', title: c.name,
          sub: [c.company, c.email].filter(Boolean).join(' · '),
          appId: 'crm', appTitle: 'CRM — MAK OS',
        })
      );

    deals
      .filter((d) =>
        d.title.toLowerCase().includes(lq) ||
        (d.notes ?? '').toLowerCase().includes(lq)
      )
      .slice(0, 4)
      .forEach((d) =>
        found.push({
          id: d.id, type: 'deal', title: d.title,
          sub: `${d.stage} · $${(d.value ?? 0).toLocaleString()}`,
          appId: 'deals', appTitle: 'Deals — MAK OS',
        })
      );

    notes
      .filter((n) =>
        n.title.toLowerCase().includes(lq) ||
        (n.content ?? '').toLowerCase().includes(lq)
      )
      .slice(0, 4)
      .forEach((n) =>
        found.push({
          id: n.id, type: 'note', title: n.title,
          sub: (n.content ?? '').slice(0, 60),
          appId: 'notes', appTitle: 'Notes — MAK OS',
        })
      );

    tasks
      .filter((t) =>
        t.title.toLowerCase().includes(lq) ||
        (t.description ?? '').toLowerCase().includes(lq)
      )
      .slice(0, 4)
      .forEach((t) =>
        found.push({
          id: t.id, type: 'task', title: t.title,
          sub: `${t.priority} · ${t.status}`,
          appId: 'tasks', appTitle: 'Tasks — MAK OS',
        })
      );

    setResults(found);
    setActiveIdx(0);
  }, [contacts, deals, notes, tasks]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 150);
    return () => clearTimeout(t);
  }, [query, search]);

  const openResult = (r: SpotlightResult) => {
    openWindow(r.appId, r.appTitle);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIdx]) openResult(results[activeIdx]);
  };

  // Group by type in stable order
  const grouped = TYPE_ORDER.reduce<Record<string, SpotlightResult[]>>((acc, type) => {
    const items = results.filter((r) => r.type === type);
    if (items.length) acc[type] = items;
    return acc;
  }, {});

  let globalIdx = 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[99990] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed z-[99991] left-1/2 top-[22%]"
            style={{ x: '-50%' }}
            initial={{ scale: 0.96, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="w-[520px] rounded-2xl shadow-2xl border border-gold/20 overflow-hidden"
              style={{ background: 'rgba(12,12,16,0.97)', backdropFilter: 'blur(40px)' }}
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gold/10">
                <Search size={17} className="text-gold/50 flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Search contacts, deals, notes, tasks…"
                  className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-secondary/35 focus:outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-text-secondary/50 hover:text-text-secondary transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="max-h-[380px] overflow-auto py-2">
                  {(Object.entries(grouped) as [SpotlightResult['type'], SpotlightResult[]][]).map(([type, items]) => {
                    const meta = TYPE_META[type];
                    const Icon = meta.icon;
                    return (
                      <div key={type}>
                        <p className="px-5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary/35">
                          {meta.label}
                        </p>
                        {items.map((r) => {
                          const idx = globalIdx;
                          const isActive = idx === activeIdx;
                          globalIdx++;
                          return (
                            <button
                              key={r.id}
                              onClick={() => openResult(r)}
                              onMouseEnter={() => setActiveIdx(idx)}
                              className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                                isActive ? 'bg-gold/10' : 'hover:bg-white/4'
                              }`}
                            >
                              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/15 flex items-center justify-center flex-shrink-0">
                                <Icon size={13} className="text-gold/60" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium text-text-primary truncate">{r.title}</p>
                                {r.sub && (
                                  <p className="text-[11px] text-text-secondary/60 truncate mt-0.5">{r.sub}</p>
                                )}
                              </div>
                              {isActive && (
                                <span className="text-[10px] text-text-secondary/30 flex-shrink-0">↵</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {query && results.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <p className="text-[13px] text-text-secondary/40">No results for &ldquo;{query}&rdquo;</p>
                </div>
              )}

              {!query && (
                <div className="px-5 py-6 text-center">
                  <p className="text-[12px] text-text-secondary/25">Type to search across all apps</p>
                </div>
              )}

              {/* Footer hints */}
              <div className="border-t border-white/5 px-5 py-2 flex items-center gap-5 text-[10px] text-text-secondary/25">
                <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono">↵</kbd> open app</span>
                <span><kbd className="font-mono">esc</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
