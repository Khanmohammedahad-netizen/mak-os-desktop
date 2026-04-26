"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TerminalLine {
  id: number;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
}

const COMMANDS: Record<string, () => string | string[]> = {
  help: () => [
    '  Available commands:',
    '  help         — Show this help message',
    '  about        — About MAK OS',
    '  clear        — Clear terminal',
    '  whoami       — Current user',
    '  version      — System version',
    '  apps         — List installed apps',
    '  uptime       — System uptime',
    '  date         — Current date & time',
    '  ls           — List files (simulated)',
    '  echo [text]  — Print text',
  ],
  about: () => [
    '  ╔══════════════════════════════════════╗',
    '  ║       MAK OS Desktop v2.0.0          ║',
    '  ║   Central Command for MAK Software   ║',
    '  ╚══════════════════════════════════════╝',
    '  Built with Next.js, TypeScript, Tailwind',
    '  Powered by Supabase + Vercel',
  ],
  whoami: () => 'mak-admin@mak-software.com',
  version: () => 'MAK OS Desktop 2.0.0 (Build 20260426)',
  uptime: () => `System uptime: ${Math.floor(Math.random() * 72) + 1}h ${Math.floor(Math.random() * 60)}m`,
  date: () => new Date().toString(),
  apps: () => [
    '  Installed applications:',
    '  /apps/crm          — CRM & Lead Management',
    '  /apps/deals        — Sales Pipeline',
    '  /apps/notes        — Notes & Documents',
    '  /apps/tasks        — Task Manager',
    '  /apps/analytics    — Analytics Dashboard',
    '  /apps/calendar     — Calendar',
    '  /apps/terminal     — Terminal (you are here)',
    '  /apps/settings     — System Settings',
    '  /apps/mak-os-v1    — MAK OS v1 Integration',
  ],
  ls: () => [
    '  drwxr-xr-x  apps/',
    '  drwxr-xr-x  components/',
    '  drwxr-xr-x  stores/',
    '  drwxr-xr-x  lib/',
    '  -rw-r--r--  CLAUDE.md',
    '  -rw-r--r--  package.json',
  ],
  clear: () => '__CLEAR__',
};

let lineCounter = 0;

export const TerminalApp = () => {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: ++lineCounter, type: 'system', content: 'MAK OS Terminal v2.0.0 — Type "help" to get started.' },
    { id: ++lineCounter, type: 'system', content: '──────────────────────────────────────────────────────' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const addLine = (line: Omit<TerminalLine, 'id'>) => {
    setLines(prev => [...prev, { ...line, id: ++lineCounter }]);
  };

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addLine({ type: 'input', content: `mak@desktop:~$ ${trimmed}` });
    setHistory(prev => [trimmed, ...prev]);
    setHistoryIdx(-1);

    const [base, ...args] = trimmed.split(' ');
    const fn = COMMANDS[base.toLowerCase()];

    if (fn) {
      const result = fn();
      if (result === '__CLEAR__') {
        setLines([{ id: ++lineCounter, type: 'system', content: 'Terminal cleared.' }]);
        return;
      }
      const outputs = Array.isArray(result) ? result : [result];
      outputs.forEach(line => addLine({ type: 'output', content: line }));
    } else if (base === 'echo') {
      addLine({ type: 'output', content: args.join(' ') });
    } else {
      addLine({ type: 'error', content: `  command not found: ${base}. Type "help" for available commands.` });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(newIdx);
      setInput(history[newIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(newIdx);
      setInput(newIdx === -1 ? '' : history[newIdx]);
    }
  };

  return (
    <div
      className="h-full bg-[#06060A] flex flex-col font-mono text-[13px] cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal Output */}
      <div className="flex-1 overflow-auto p-6 space-y-0.5 scrollbar-thin">
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.1 }}
              className={
                line.type === 'input'
                  ? 'text-gold-light'
                  : line.type === 'error'
                  ? 'text-os-red'
                  : line.type === 'system'
                  ? 'text-gold/50'
                  : 'text-[#A0A0A0]'
              }
            >
              {line.content}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input Line */}
      <div className="flex items-center px-6 py-3 border-t border-gold/10 bg-black/30">
        <span className="text-gold-light mr-2 select-none">mak@desktop:~$</span>
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-[#E0E0E0] focus:outline-none caret-gold"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
};
