"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCRMStore } from '@/stores/crmStore';
import { useDealsStore } from '@/stores/dealsStore';
import { useNotesStore } from '@/stores/notesStore';
import { useTasksStore } from '@/stores/tasksStore';

interface Line {
  id: number;
  type: 'input' | 'output' | 'error' | 'system' | 'boot';
  content: string;
}

let lineId = 0;
const mkLine = (type: Line['type'], content: string): Line => ({ id: ++lineId, type, content });

const PROMPT = 'mak@desktop ~ $';

export const TerminalApp = () => {
  const { contacts } = useCRMStore();
  const { deals } = useDealsStore();
  const { notes } = useNotesStore();
  const { tasks } = useTasksStore();

  const [bootDone, setBootDone] = useState(false);
  const [bootedLines, setBootedLines] = useState<string[]>([]);
  const [typingLine, setTypingLine] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  // ── Boot sequence ──────────────────────────────────────────────────────────
  useEffect(() => {
    const pending = tasks.filter((t) => t.status !== 'done').length;
    const active = deals.filter((d) => !['Closed Won', 'Closed Lost'].includes(d.stage)).length;

    const BOOT = [
      'MAK OS Desktop v1.0',
      'Initializing system...',
      `✓ CRM loaded — ${contacts.length} contacts`,
      `✓ Deals loaded — ${active} active`,
      `✓ Notes loaded — ${notes.length} notes`,
      `✓ Tasks loaded — ${pending} pending`,
      '✓ MAK OS v1 engine — ONLINE',
      '',
      "Type 'help' for available commands.",
    ];

    let li = 0;
    let ci = 0;
    let tid: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (li >= BOOT.length) { setBootDone(true); return; }
      const line = BOOT[li];
      if (ci <= line.length) {
        setTypingLine(line.slice(0, ci));
        ci++;
        tid = setTimeout(tick, line.startsWith('✓') ? 20 : 35);
      } else {
        setBootedLines((p) => [...p, line]);
        setTypingLine('');
        li++;
        ci = 0;
        tid = setTimeout(tick, line === '' ? 40 : 90);
      }
    };

    tid = setTimeout(tick, 150);
    return () => clearTimeout(tid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bootedLines, typingLine, lines]);

  useEffect(() => {
    if (bootDone) inputRef.current?.focus();
  }, [bootDone]);

  // ── Commands ───────────────────────────────────────────────────────────────
  const addLines = useCallback((...newLines: Omit<Line, 'id'>[]) => {
    setLines((prev) => [...prev, ...newLines.map((l) => mkLine(l.type, l.content))]);
  }, []);

  const runCommand = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;

    setLines((prev) => [...prev, mkLine('input', `${PROMPT} ${cmd}`)]);
    setHistory((h) => [cmd, ...h]);
    setHistoryIdx(-1);

    const [base, sub, ...rest] = cmd.toLowerCase().split(' ');

    if (base === 'clear') {
      setLines([]);
      return;
    }

    if (base === 'help') {
      addLines(
        { type: 'output', content: '  Available commands:' },
        { type: 'output', content: '  help                     — List commands' },
        { type: 'output', content: '  stats                    — Quick system stats' },
        { type: 'output', content: '  contacts search <query>  — Search contacts' },
        { type: 'output', content: '  deals summary            — Pipeline overview' },
        { type: 'output', content: '  about                    — About MAK OS' },
        { type: 'output', content: '  clear                    — Clear terminal' },
      );
      return;
    }

    if (base === 'about') {
      addLines(
        { type: 'output', content: '  ┌──────────────────────────────────────┐' },
        { type: 'output', content: '  │      MAK OS Desktop v1.0             │' },
        { type: 'output', content: '  │   MAK Software Solutions            │' },
        { type: 'output', content: '  │   Mohammed Ahad Khan (Founder)      │' },
        { type: 'output', content: '  └──────────────────────────────────────┘' },
        { type: 'output', content: '  Stack: Next.js 16 · Supabase · Recharts · Framer Motion' },
      );
      return;
    }

    if (base === 'stats') {
      const active = deals.filter((d) => !['Closed Won', 'Closed Lost'].includes(d.stage));
      const pipelineValue = active.reduce((s, d) => s + (d.value ?? 0), 0);
      const won = deals.filter((d) => d.stage === 'Closed Won').length;
      const lost = deals.filter((d) => d.stage === 'Closed Lost').length;
      const winRate = won + lost > 0 ? ((won / (won + lost)) * 100).toFixed(1) : '0.0';
      const pending = tasks.filter((t) => t.status !== 'done').length;
      addLines(
        { type: 'output', content: '  System Stats' },
        { type: 'output', content: `  Contacts          : ${contacts.length}` },
        { type: 'output', content: `  Active Deals      : ${active.length}` },
        { type: 'output', content: `  Pipeline Value    : $${pipelineValue.toLocaleString()}` },
        { type: 'output', content: `  Pending Tasks     : ${pending}` },
        { type: 'output', content: `  Win Rate          : ${winRate}%` },
      );
      return;
    }

    if (base === 'contacts' && sub === 'search') {
      const query = rest.join(' ');
      if (!query) { addLines({ type: 'error', content: '  Usage: contacts search <query>' }); return; }
      setBusy(true);

      if (isMock) {
        const q = query.toLowerCase();
        const results = contacts.filter(
          (c) => c.name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q)
        );
        showContactResults(results, query);
        setBusy(false);
      } else {
        try {
          const res = await fetch(`/api/contacts?search=${encodeURIComponent(query)}`);
          const data = await res.json();
          showContactResults(Array.isArray(data) ? data : [], query);
        } catch { addLines({ type: 'error', content: '  Error: Failed to search contacts.' }); }
        setBusy(false);
      }
      return;
    }

    if (base === 'deals' && sub === 'summary') {
      const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
      addLines({ type: 'output', content: '  Pipeline Summary' });
      STAGES.forEach((stage) => {
        const stageDeal = deals.filter((d) => d.stage === stage);
        const val = stageDeal.reduce((s, d) => s + (d.value ?? 0), 0);
        if (stageDeal.length > 0) {
          addLines({
            type: 'output',
            content: `  ${stage.padEnd(14)} : ${String(stageDeal.length).padStart(2)} deal${stageDeal.length !== 1 ? 's' : ' '} · $${val.toLocaleString()}`,
          });
        }
      });
      const total = deals.filter((d) => !['Closed Won', 'Closed Lost'].includes(d.stage))
        .reduce((s, d) => s + (d.value ?? 0), 0);
      addLines({ type: 'output', content: `  ${'Total Pipeline'.padEnd(14)} : $${total.toLocaleString()}` });
      return;
    }

    addLines({ type: 'error', content: `  command not found: ${base}. Type 'help' for available commands.` });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, deals, notes, tasks, isMock, addLines]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const showContactResults = (results: any[], query: string) => {
    if (results.length === 0) {
      addLines({ type: 'output', content: `  No contacts found for "${query}"` });
    } else {
      addLines({ type: 'output', content: `  Found ${results.length} contact${results.length !== 1 ? 's' : ''} for "${query}":` });
      results.slice(0, 8).forEach((c) => {
        addLines({
          type: 'output',
          content: `  → ${c.name}${c.email ? ` · ${c.email}` : ''}${c.company ? ` · ${c.company}` : ''} · ${c.status}`,
        });
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (busy) return;
      runCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(idx);
      setInput(history[idx] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setInput(idx === -1 ? '' : history[idx]);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-full flex flex-col cursor-text"
      style={{ backgroundColor: '#0A0A0A', fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace' }}
      onClick={() => bootDone && inputRef.current?.focus()}
    >
      <div className="flex-1 overflow-auto p-5 space-y-0.5 text-[13px] leading-relaxed">
        {/* Boot lines */}
        {bootedLines.map((line, i) => (
          <div
            key={`boot-${i}`}
            className={line.startsWith('✓') ? 'text-[#28C840]' : line === '' ? 'h-2' : 'text-[#C9A84C]/60'}
          >
            {line || ' '}
          </div>
        ))}

        {/* Currently typing line */}
        {!bootDone && (
          <div className={typingLine.startsWith('✓') ? 'text-[#28C840]' : 'text-[#C9A84C]/60'}>
            {typingLine}
            <span className="animate-pulse text-[#C9A84C]">█</span>
          </div>
        )}

        {/* Post-boot lines */}
        {lines.map((line) => (
          <div
            key={line.id}
            className={
              line.type === 'input'
                ? 'text-[#C9A84C]'
                : line.type === 'error'
                ? 'text-[#FF5F57]'
                : line.type === 'system'
                ? 'text-[#C9A84C]/40'
                : 'text-[#A8A8A8]'
            }
          >
            {line.content || ' '}
          </div>
        ))}

        {busy && (
          <div className="text-[#C9A84C]/50 animate-pulse">  Loading...</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {bootDone && (
        <div
          className="flex items-center px-5 py-3 border-t text-[13px]"
          style={{ borderColor: 'rgba(201,168,76,0.15)', backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <span className="text-[#C9A84C] mr-2 select-none whitespace-nowrap">{PROMPT}</span>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
            className="flex-1 bg-transparent focus:outline-none caret-[#C9A84C]"
            style={{ color: '#E0E0E0', fontFamily: 'inherit', fontSize: 'inherit' }}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      )}
    </div>
  );
};
