"use client";

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface CalendarEvent {
  id: string;
  title: string;
  date: number;
  color: string;
  time?: string;
}

// Sample events to make it look populated
const SAMPLE_EVENTS: CalendarEvent[] = [
  { id: '1', title: 'Client Call — Acme', date: new Date().getDate(), color: 'bg-gold/80', time: '10:00 AM' },
  { id: '2', title: 'Send Proposal', date: new Date().getDate() + 2, color: 'bg-blue-500/70', time: '2:00 PM' },
  { id: '3', title: 'Team Standup', date: new Date().getDate() + 4, color: 'bg-purple-500/70', time: '9:00 AM' },
  { id: '4', title: 'Invoice Follow-up', date: new Date().getDate() - 1, color: 'bg-green-500/70', time: '11:00 AM' },
  { id: '5', title: 'Strategy Review', date: new Date().getDate() + 7, color: 'bg-orange-500/70' },
];

export const CalendarApp = () => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today.getDate());
  };

  const eventsForDay = (day: number) =>
    SAMPLE_EVENTS.filter(e => {
      const d = e.date > 0 && e.date <= daysInMonth ? e.date : null;
      return d === day;
    });

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  // Build calendar grid
  const cells: { day: number; type: 'prev' | 'current' | 'next' }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, type: 'prev' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: 'current' });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, type: 'next' });
  }

  return (
    <div className="flex h-full bg-bg-surface/20">
      {/* Main Calendar */}
      <div className="flex-1 flex flex-col p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-display font-semibold text-gold tracking-tight">
              {MONTHS[month]} {year}
            </h2>
            <div className="flex items-center space-x-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-gold border border-gold/10 hover:border-gold/30 rounded-lg transition-all"
            >
              Today
            </button>
            <Button size="sm" className="space-x-2">
              <Plus size={14} />
              <span>New Event</span>
            </Button>
          </div>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[11px] font-bold uppercase tracking-widest text-text-secondary py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {cells.map((cell, idx) => {
            const isToday =
              cell.type === 'current' &&
              cell.day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            const isSelected = cell.type === 'current' && cell.day === selectedDay;
            const events = cell.type === 'current' ? eventsForDay(cell.day) : [];

            return (
              <button
                key={idx}
                onClick={() => cell.type === 'current' && setSelectedDay(cell.day)}
                className={cn(
                  'relative p-2 rounded-xl text-sm transition-all flex flex-col items-center min-h-[60px]',
                  cell.type !== 'current' && 'opacity-25 pointer-events-none',
                  isSelected && 'bg-gold/15 ring-1 ring-gold/40',
                  !isSelected && cell.type === 'current' && 'hover:bg-white/5',
                  isToday && !isSelected && 'ring-1 ring-gold/30'
                )}
              >
                <span className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-medium transition-colors',
                  isToday ? 'bg-gold text-bg-primary font-bold' : cell.type === 'current' ? 'text-text-primary' : 'text-text-secondary'
                )}>
                  {cell.day}
                </span>
                <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                  {events.slice(0, 3).map(ev => (
                    <div key={ev.id} className={cn('w-1.5 h-1.5 rounded-full', ev.color)} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side Panel — Day View */}
      <div className="w-72 border-l border-gold/10 bg-black/20 flex flex-col p-5 space-y-5">
        <div>
          <h3 className="text-lg font-display font-semibold text-gold">
            {selectedDay
              ? `${MONTHS[month].slice(0, 3)} ${selectedDay}`
              : 'Select a day'}
          </h3>
          <p className="text-[11px] text-text-secondary">
            {selectedDay === today.getDate() && month === today.getMonth() && year === today.getFullYear()
              ? 'Today'
              : `${MONTHS[month]} ${year}`}
          </p>
        </div>

        <div className="flex-1 space-y-3">
          {selectedEvents.length > 0 ? (
            selectedEvents.map((ev) => (
              <div key={ev.id} className="flex items-start space-x-3 p-3 rounded-xl bg-white/5 border border-gold/5 hover:border-gold/20 transition-all cursor-pointer">
                <div className={cn('w-1 h-full min-h-[40px] rounded-full mt-0.5', ev.color)} />
                <div>
                  <p className="text-sm font-medium text-text-primary">{ev.title}</p>
                  {ev.time && <p className="text-[11px] text-text-secondary mt-0.5">{ev.time}</p>}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <div className="w-10 h-10 bg-gold/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-gold/10">
                <Plus size={18} className="text-gold/30" />
              </div>
              <p className="text-[12px] text-text-secondary">No events on this day</p>
            </div>
          )}
        </div>

        <button className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl border border-gold/20 bg-gold/5 text-gold hover:bg-gold/10 transition-all text-sm font-medium">
          <Plus size={14} />
          <span>Add Event</span>
        </button>
      </div>
    </div>
  );
};
