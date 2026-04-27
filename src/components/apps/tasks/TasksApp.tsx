"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Plus, CheckSquare, ChevronRight, AlertCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { TaskItem } from './TaskItem';
import { useTasksStore } from '@/stores/tasksStore';
import { useCRMStore } from '@/stores/crmStore';
import { useDealsStore } from '@/stores/dealsStore';
import { Task } from '@/types';

type StatusFilter = 'all' | 'todo' | 'in-progress' | 'done';

const PRIORITIES: Task['priority'][] = ['urgent', 'high', 'medium', 'low'];

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  urgent: 'text-red-400',
  high: 'text-orange-400',
  medium: 'text-yellow-400',
  low: 'text-green-400',
};

const MOCK_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Send Q3 proposal to Acme Corp',
    description: 'Finalize pricing, attach case studies, add cover letter.',
    status: 'todo',
    priority: 'urgent',
    due_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    linked_contact_id: null,
    linked_deal_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Follow up with FinTech Startup re: contract',
    description: 'Legal review complete — get signature by Friday.',
    status: 'in-progress',
    priority: 'urgent',
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    linked_contact_id: null,
    linked_deal_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'Update CRM contact data for Q3',
    description: 'Audit stale contacts, update deal values.',
    status: 'todo',
    priority: 'high',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    linked_contact_id: null,
    linked_deal_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-4',
    title: 'Schedule demo with Retail Chain team',
    description: null,
    status: 'todo',
    priority: 'high',
    due_date: new Date().toISOString().split('T')[0],
    linked_contact_id: null,
    linked_deal_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-5',
    title: 'Review analytics dashboard with team',
    description: 'Walk through Q2 metrics, identify gaps.',
    status: 'in-progress',
    priority: 'medium',
    due_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    linked_contact_id: null,
    linked_deal_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-6',
    title: 'Draft newsletter content for August',
    description: null,
    status: 'todo',
    priority: 'medium',
    due_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    linked_contact_id: null,
    linked_deal_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-7',
    title: 'Update project documentation',
    description: 'Bring README up to date with latest API changes.',
    status: 'done',
    priority: 'low',
    due_date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
    linked_contact_id: null,
    linked_deal_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-8',
    title: 'Research competitor pricing',
    description: null,
    status: 'todo',
    priority: 'low',
    due_date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
    linked_contact_id: null,
    linked_deal_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-9',
    title: 'Healthcare kickoff meeting prep',
    description: 'Prepare agenda, slides, and resource allocation plan.',
    status: 'in-progress',
    priority: 'high',
    due_date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
    linked_contact_id: null,
    linked_deal_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'task-10',
    title: 'Renew domain registrations',
    description: null,
    status: 'done',
    priority: 'medium',
    due_date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    linked_contact_id: null,
    linked_deal_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const selectCls =
  'bg-[#1A1A1D] border border-gold/10 rounded px-2 py-1 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/40';

export const TasksApp = () => {
  const { tasks, setTasks, setLoading, loading, addTask } = useTasksStore();
  const { contacts } = useCRMStore();
  const { deals } = useDealsStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [collapsed, setCollapsed] = useState<Set<Task['priority']>>(new Set());
  const [showAdd, setShowAdd] = useState(false);

  const [addTitle, setAddTitle] = useState('');
  const [addPriority, setAddPriority] = useState<Task['priority']>('medium');
  const [addDue, setAddDue] = useState('');
  const [addStatus, setAddStatus] = useState<Task['status']>('todo');
  const [addContact, setAddContact] = useState('');
  const [addDeal, setAddDeal] = useState('');

  const titleRef = useRef<HTMLInputElement>(null);
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  useEffect(() => {
    if (isMock) { setTasks(MOCK_TASKS); return; }
    const fetch_ = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/tasks');
        const data = await res.json();
        if (Array.isArray(data)) setTasks(data);
      } catch (e) {
        console.error('Failed to fetch tasks:', e);
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [setTasks, setLoading, isMock]);

  useEffect(() => {
    if (showAdd) titleRef.current?.focus();
  }, [showAdd]);

  const handleAdd = async () => {
    if (!addTitle.trim()) return;
    const payload: Partial<Task> = {
      title: addTitle.trim(),
      status: addStatus,
      priority: addPriority,
      due_date: addDue || undefined,
      linked_contact_id: addContact || undefined,
      linked_deal_id: addDeal || undefined,
    };

    if (isMock) {
      addTask({
        id: `task-${Date.now()}`,
        description: null,
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Task);
    } else {
      try {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error();
        addTask(await res.json());
      } catch { return; }
    }

    setAddTitle('');
    setAddDue('');
    setAddContact('');
    setAddDeal('');
    setShowAdd(false);
  };

  const toggleCollapse = (p: Task['priority']) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  };

  const filtered = tasks.filter((t) => statusFilter === 'all' || t.status === statusFilter);

  const urgentActive = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;

  const STATUS_TABS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'todo', label: 'To Do' },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'done', label: 'Done' },
  ];

  return (
    <div className="flex flex-col h-full bg-bg-surface/30">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-gold/10 bg-white/5 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-display font-semibold text-gold">Tasks</h2>
            {urgentActive > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <AlertCircle size={9} />
                {urgentActive} urgent
              </span>
            )}
          </div>
          <Button
            onClick={() => setShowAdd((s) => !s)}
            size="sm"
            variant={showAdd ? 'secondary' : 'primary'}
            className="space-x-1.5 h-7 text-[12px]"
          >
            <Plus size={13} />
            <span>Add Task</span>
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1">
          {STATUS_TABS.map((tab) => {
            const count = tab.id === 'all' ? tasks.length : tasks.filter((t) => t.status === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all',
                  statusFilter === tab.id
                    ? 'bg-gold/15 text-gold border border-gold/25'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                )}
              >
                {tab.label}
                <span className={cn('text-[10px] font-bold', statusFilter === tab.id ? 'text-gold/70' : 'text-text-secondary/50')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-gold/10 bg-gold/3 flex-shrink-0"
          >
            <div className="px-4 py-3 space-y-2">
              <input
                ref={titleRef}
                type="text"
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') setShowAdd(false);
                }}
                placeholder="Task title..."
                className="w-full bg-white/8 border border-gold/20 rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/40 placeholder:text-text-secondary/40"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <select value={addPriority} onChange={(e) => setAddPriority(e.target.value as Task['priority'])} className={selectCls}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                </select>
                <select value={addStatus} onChange={(e) => setAddStatus(e.target.value as Task['status'])} className={selectCls}>
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <input
                  type="date"
                  value={addDue}
                  onChange={(e) => setAddDue(e.target.value)}
                  className={selectCls}
                  placeholder="Due date"
                />
              </div>
              {(contacts.length > 0 || deals.length > 0) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {contacts.length > 0 && (
                    <select value={addContact} onChange={(e) => setAddContact(e.target.value)} className={selectCls}>
                      <option value="">Link contact…</option>
                      {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                  {deals.length > 0 && (
                    <select value={addDeal} onChange={(e) => setAddDeal(e.target.value)} className={selectCls}>
                      <option value="">Link deal…</option>
                      {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
                    </select>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleAdd} className="h-7 text-[12px]">Add</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="h-7 text-[12px]">Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task list grouped by priority */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-gold/5 rounded-full flex items-center justify-center mb-3 border border-gold/10">
              <CheckSquare className="text-gold/20" size={24} />
            </div>
            <p className="text-text-secondary text-sm">
              {statusFilter !== 'all' ? `No ${statusFilter} tasks` : 'No tasks yet'}
            </p>
          </div>
        ) : (
          PRIORITIES.map((priority) => {
            const group = filtered
              .filter((t) => t.priority === priority)
              .sort((a, b) => {
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
              });

            if (group.length === 0) return null;
            const isCollapsed = collapsed.has(priority);

            return (
              <div key={priority}>
                {/* Section header */}
                <button
                  onClick={() => toggleCollapse(priority)}
                  className="flex items-center gap-2 w-full mb-2 group"
                >
                  <ChevronRight
                    size={13}
                    className={cn('text-text-secondary/50 transition-transform', !isCollapsed && 'rotate-90')}
                  />
                  <span className={cn('text-[10px] font-bold uppercase tracking-widest', PRIORITY_COLOR[priority])}>
                    {PRIORITY_LABEL[priority]}
                  </span>
                  <span className="text-[10px] text-text-secondary/50 font-medium">{group.length}</span>
                  <div className="flex-1 h-[1px] bg-gold/5 ml-1" />
                </button>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 pb-1 group">
                        <AnimatePresence mode="popLayout">
                          {group.map((task) => (
                            <TaskItem key={task.id} task={task} />
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
