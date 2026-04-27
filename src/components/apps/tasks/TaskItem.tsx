"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Check, Trash2, MoreVertical, Link, Briefcase, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Task } from '@/types';
import { useTasksStore } from '@/stores/tasksStore';
import { useToastStore } from '@/stores/toastStore';
import { useCRMStore } from '@/stores/crmStore';
import { useDealsStore } from '@/stores/dealsStore';

const PRIORITY_DOT: Record<Task['priority'], string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const dueDateColor = (dateStr: string | null | undefined, done: boolean): string => {
  if (!dateStr || done) return 'text-[#999]';
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (target < today) return 'text-red-400';
  if (target.getTime() === today.getTime()) return 'text-yellow-400';
  return 'text-[#999]';
};

const fmt = (dateStr: string): string => {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (target.getTime() === today.getTime()) return 'Today';
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const STATUSES: Task['status'][] = ['todo', 'in-progress', 'done'];
const PRIORITIES: Task['priority'][] = ['urgent', 'high', 'medium', 'low'];
const STATUS_LABELS: Record<Task['status'], string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
};

interface TaskItemProps {
  task: Task;
}

export const TaskItem = ({ task }: TaskItemProps) => {
  const { updateTask, removeTask } = useTasksStore();
  const { toast } = useToastStore();
  const { contacts } = useCRMStore();
  const { deals } = useDealsStore();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description ?? '');
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDue, setEditDue] = useState(task.due_date ?? '');
  const [editStatus, setEditStatus] = useState(task.status);
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  const isDone = task.status === 'done';
  const linkedContact = task.linked_contact_id ? contacts.find((c) => c.id === task.linked_contact_id) : null;
  const linkedDeal = task.linked_deal_id ? deals.find((d) => d.id === task.linked_deal_id) : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const patch = async (updates: Partial<Task>) => {
    updateTask(task.id, updates);
    if (isMock) return;
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch {
      toast('Failed to update task', 'error');
    }
  };

  const toggleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = isDone ? 'todo' : 'done';
    patch({ status: next });
    if (next === 'done') toast('Task completed');
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    removeTask(task.id);
    toast('Task deleted');
    if (!isMock) {
      try { await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }); } catch { /* noop */ }
    }
  };

  const saveEdit = async () => {
    const updates: Partial<Task> = {
      title: editTitle.trim() || task.title,
      description: editDesc || undefined,
      priority: editPriority,
      due_date: editDue || undefined,
      status: editStatus,
    };
    await patch(updates);
    setEditing(false);
    setExpanded(false);
    toast('Task saved');
  };

  const selectCls = 'bg-[#1A1A1D] border border-gold/10 rounded px-2 py-1 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/40';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={cn(
        'rounded-xl border transition-colors',
        isDone ? 'bg-white/2 border-gold/5' : 'bg-white/5 border-gold/10 hover:border-gold/20'
      )}
    >
      {/* Main row */}
      <div
        className="flex items-start gap-2.5 p-3 cursor-pointer select-none"
        onClick={() => { if (!editing) setExpanded((e) => !e); }}
      >
        {/* Priority dot */}
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1.5', PRIORITY_DOT[task.priority])} />

        {/* Checkbox */}
        <button
          onClick={toggleDone}
          className={cn(
            'flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all mt-0.5',
            isDone ? 'bg-green-500 border-green-500' : 'border-text-secondary/30 hover:border-gold'
          )}
        >
          {isDone && <Check size={9} className="text-white" strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-[13px] font-medium leading-snug truncate', isDone ? 'line-through text-text-secondary' : 'text-text-primary')}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {task.due_date && (
              <span className={cn('text-[10px] font-medium', dueDateColor(task.due_date, isDone))}>
                {fmt(task.due_date)}
              </span>
            )}
            {task.status === 'in-progress' && !isDone && (
              <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">
                In Progress
              </span>
            )}
          </div>
        </div>

        {/* Three-dot */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="p-1 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100"
            style={{ opacity: menuOpen ? 1 : undefined }}
          >
            <MoreVertical size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 glass border border-gold/20 rounded-xl shadow-2xl z-30 overflow-hidden py-1">
              <MenuSection label="Status">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); patch({ status: s }); }}
                    className={cn('w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/10 transition-colors', task.status === s ? 'text-gold font-semibold' : 'text-text-primary')}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </MenuSection>
              <div className="my-1 border-t border-gold/10" />
              <MenuSection label="Priority">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); patch({ priority: p }); }}
                    className={cn('w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/10 transition-colors flex items-center gap-2', task.priority === p ? 'text-gold font-semibold' : 'text-text-primary')}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', PRIORITY_DOT[p])} />
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </MenuSection>
              <div className="my-1 border-t border-gold/10" />
              <button
                onClick={handleDelete}
                className="w-full text-left px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded / Edit */}
      <AnimatePresence>
        {expanded && !editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 space-y-2 border-t border-gold/5 mt-0 ml-[30px]">
              {task.description && (
                <p className="text-[12px] text-text-secondary leading-relaxed pt-2">{task.description}</p>
              )}

              {(linkedContact || linkedDeal) && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {linkedContact && (
                    <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-gold/10 rounded-full px-2 py-0.5 text-text-secondary">
                      <Link size={9} />
                      {linkedContact.name}
                    </span>
                  )}
                  {linkedDeal && (
                    <span className="flex items-center gap-1 text-[10px] bg-white/5 border border-gold/10 rounded-full px-2 py-0.5 text-text-secondary">
                      <Briefcase size={9} />
                      {linkedDeal.title}
                    </span>
                  )}
                </div>
              )}

              {!task.description && !linkedContact && !linkedDeal && (
                <p className="text-[11px] text-text-secondary/50 italic pt-2">No description.</p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                  className="text-[11px] text-gold/70 hover:text-gold transition-colors"
                >
                  Edit
                </button>
                <span className="text-text-secondary/30">·</span>
                <button
                  onClick={handleDelete}
                  className="text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {expanded && editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div
              className="px-3 pb-3 space-y-2 border-t border-gold/10 mt-0"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full mt-2 bg-white/5 border border-gold/20 rounded-lg px-2.5 py-1.5 text-[13px] text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/40"
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full bg-white/5 border border-gold/10 rounded-lg px-2.5 py-1.5 text-[12px] text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none placeholder:text-text-secondary/40"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as Task['priority'])} className={selectCls}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as Task['status'])} className={selectCls}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
                <input
                  type="date"
                  value={editDue}
                  onChange={(e) => setEditDue(e.target.value)}
                  className={selectCls}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  className="text-[11px] font-semibold text-gold hover:text-gold/80 transition-colors"
                >
                  Save
                </button>
                <span className="text-text-secondary/30">·</span>
                <button
                  onClick={() => { setEditing(false); setEditTitle(task.title); setEditDesc(task.description ?? ''); setEditPriority(task.priority); setEditDue(task.due_date ?? ''); setEditStatus(task.status); }}
                  className="text-[11px] text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const MenuSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="px-3 py-1 text-[9px] uppercase tracking-widest text-text-secondary/50 font-bold">{label}</p>
    {children}
  </div>
);
