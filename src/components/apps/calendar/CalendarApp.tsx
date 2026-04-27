"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CheckSquare, Users, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTasksStore } from '@/stores/tasksStore';
import { useCRMStore } from '@/stores/crmStore';
import { useDealsStore } from '@/stores/dealsStore';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
// Monday-first
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalItem {
  type: 'task' | 'followup' | 'deal';
  label: string;
  color: string;
  dotColor: string;
}

function toDateKey(d: string | null | undefined): string {
  if (!d) return '';
  return d.slice(0, 10); // "YYYY-MM-DD"
}

function buildKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const CalendarApp = () => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const { tasks, setTasks } = useTasksStore();
  const { contacts, setContacts } = useCRMStore();
  const { deals, setDeals } = useDealsStore();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load data if stores empty and not in mock mode
  useEffect(() => {
    const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
    if (isMock) return;
    const load = async () => {
      try {
        if (tasks.length === 0) {
          const r = await fetch('/api/tasks'); const d = await r.json();
          if (Array.isArray(d)) setTasks(d);
        }
        if (contacts.length === 0) {
          const r = await fetch('/api/contacts'); const d = await r.json();
          if (Array.isArray(d)) setContacts(d);
        }
        if (deals.length === 0) {
          const r = await fetch('/api/deals'); const d = await r.json();
          if (Array.isArray(d)) setDeals(d);
        }
      } catch (e) { console.error('Calendar load error:', e); }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build date → items map
  const calMap = useMemo(() => {
    const map: Record<string, CalItem[]> = {};

    const add = (key: string, item: CalItem) => {
      if (!key) return;
      map[key] = map[key] ?? [];
      map[key].push(item);
    };

    tasks.forEach((t) => {
      if (t.due_date && t.status !== 'done') {
        add(toDateKey(t.due_date), {
          type: 'task',
          label: t.title,
          color: 'text-gold',
          dotColor: 'bg-gold',
        });
      }
    });

    contacts.forEach((c) => {
      if (c.next_follow_up_at) {
        add(toDateKey(c.next_follow_up_at), {
          type: 'followup',
          label: `Follow-up: ${c.name}`,
          color: 'text-blue-400',
          dotColor: 'bg-blue-400',
        });
      }
    });

    deals.forEach((d) => {
      if (d.expected_close_date && d.stage !== 'Closed Won' && d.stage !== 'Closed Lost') {
        add(toDateKey(d.expected_close_date), {
          type: 'deal',
          label: `Close: ${d.title}`,
          color: 'text-green-400',
          dotColor: 'bg-green-400',
        });
      }
    });

    return map;
  }, [tasks, contacts, deals]);

  // Calendar grid (Monday-first)
  const firstDayMon = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0..Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; type: 'prev' | 'current' | 'next' }[] = [];
  for (let i = firstDayMon - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, type: 'prev' });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: 'current' });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) cells.push({ day: d, type: 'next' });

  const selectedKey = selectedDay ? buildKey(year, month, selectedDay) : '';
  const selectedItems = selectedKey ? (calMap[selectedKey] ?? []) : [];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today.getDate());
  };

  return (
    <div className="flex flex-col h-full bg-bg-surface/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10 bg-white/5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2
            className="font-display font-semibold text-gold"
            style={{ fontSize: '24px', fontFamily: 'var(--font-display, "Cormorant Garamond", serif)' }}
          >
            {MONTHS[month]} {year}
          </h2>
          <div className="flex items-center gap-0.5">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-gold border border-gold/10 hover:border-gold/30 rounded-lg transition-all"
        >
          Today
        </button>
      </div>

      {/* Grid area */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold uppercase tracking-widest text-text-secondary py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {cells.map((cell, idx) => {
            const isToday =
              cell.type === 'current' &&
              cell.day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            const isSelected = cell.type === 'current' && cell.day === selectedDay;
            const key = cell.type === 'current' ? buildKey(year, month, cell.day) : '';
            const items = key ? (calMap[key] ?? []) : [];

            return (
              <button
                key={idx}
                onClick={() => cell.type === 'current' && setSelectedDay(cell.day)}
                className={cn(
                  'relative flex flex-col items-center pt-1.5 pb-1 rounded-xl transition-all text-sm min-h-[48px]',
                  cell.type !== 'current' && 'opacity-20 pointer-events-none',
                  isSelected && 'bg-gold/15 ring-1 ring-gold/40',
                  !isSelected && cell.type === 'current' && 'hover:bg-white/5',
                  isToday && !isSelected && 'ring-1 ring-gold/50'
                )}
              >
                <span className={cn(
                  'w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-medium',
                  isToday ? 'bg-gold text-bg-primary font-bold' : 'text-text-primary'
                )}>
                  {cell.day}
                </span>
                {items.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-1">
                    {items.slice(0, 3).map((item, i) => (
                      <div key={i} className={cn('w-1.5 h-1.5 rounded-full', item.dotColor)} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day items */}
      {selectedDay && (
        <div className="border-t border-gold/10 bg-black/10 flex-shrink-0">
          <div className="px-6 py-3">
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">
              {MONTHS[month].slice(0, 3)} {selectedDay} — {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
            </p>
            {selectedItems.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item, i) => {
                  const Icon = item.type === 'task' ? CheckSquare : item.type === 'followup' ? Users : Handshake;
                  return (
                    <div key={i} className={cn('flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-gold/10', item.color)}>
                      <Icon size={10} />
                      <span className="truncate max-w-[200px]">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-text-secondary/50 italic">No tasks, follow-ups, or deal closes.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
