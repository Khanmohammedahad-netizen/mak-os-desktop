"use client";

import React, { useEffect, useState } from 'react';
import { Plus, CheckSquare, Clock, Circle, AlertCircle, Filter } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { TaskItem } from './TaskItem';
import { useTasksStore } from '@/stores/tasksStore';
import { Task } from '@/types';

type StatusFilter = 'all' | 'todo' | 'in-progress' | 'done';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'urgent';

const STATUS_TABS: { id: StatusFilter; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: CheckSquare },
  { id: 'todo', label: 'To Do', icon: Circle },
  { id: 'in-progress', label: 'In Progress', icon: Clock },
  { id: 'done', label: 'Done', icon: CheckSquare },
];

export const TasksApp = () => {
  const { tasks, setTasks, setLoading, loading, addTask } = useTasksStore();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/tasks');
        const data = await response.json();
        if (Array.isArray(data)) setTasks(data);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [setTasks, setLoading]);

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const urgentCount = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          status: 'todo',
          priority: newTaskPriority,
        }),
      });
      if (!response.ok) throw new Error('Failed to create task');
      const newTask = await response.json();
      addTask(newTask);
      setNewTaskTitle('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-surface/30">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gold/10 bg-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-display font-semibold text-gold">Task Manager</h2>
            {urgentCount > 0 && (
              <span className="flex items-center space-x-1 text-[10px] font-bold text-os-red bg-os-red/10 border border-os-red/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                <AlertCircle size={10} />
                <span>{urgentCount} urgent</span>
              </span>
            )}
          </div>
          <Button onClick={() => setShowAddForm(true)} size="sm" className="space-x-2">
            <Plus size={14} />
            <span>New Task</span>
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'To Do', count: todoCount, color: 'text-blue-400' },
            { label: 'In Progress', count: inProgressCount, color: 'text-gold' },
            { label: 'Done', count: doneCount, color: 'text-green-400' },
            { label: 'Total', count: tasks.length, color: 'text-text-secondary' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center p-2 rounded-lg bg-white/5 border border-gold/5">
              <div className={cn('text-xl font-display font-bold', color)}>{count}</div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider font-medium">{label}</div>
            </div>
          ))}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center space-x-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
                statusFilter === tab.id
                  ? 'bg-gold/15 text-gold border border-gold/25'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              <tab.icon size={12} />
              <span>{tab.label}</span>
            </button>
          ))}

          <div className="ml-auto flex items-center space-x-2">
            <span className="text-[11px] text-text-secondary">Priority:</span>
            {(['all', 'urgent', 'high', 'medium', 'low'] as PriorityFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all border',
                  priorityFilter === p
                    ? 'bg-gold/15 text-gold border-gold/30'
                    : 'text-text-secondary/60 border-transparent hover:border-gold/10'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-gold/10 bg-gold/5"
          >
            <div className="px-6 py-4 flex items-center space-x-3">
              <div className="flex-1">
                <input
                  autoFocus
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setShowAddForm(false); }}
                  placeholder="Task title..."
                  className="w-full bg-transparent text-sm text-text-primary focus:outline-none placeholder:text-text-secondary/40"
                />
              </div>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                className="bg-white/10 border border-gold/10 rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <Button size="sm" onClick={handleAddTask}>Add</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 space-y-4">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="text-text-secondary text-sm">Loading tasks...</p>
          </div>
        ) : filteredTasks.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gold/5 rounded-full flex items-center justify-center mb-4 border border-gold/10">
              <CheckSquare className="text-gold/20" size={28} />
            </div>
            <h3 className="text-text-primary font-medium">No tasks found</h3>
            <p className="text-text-secondary text-sm mt-1">
              {statusFilter !== 'all' ? `No ${statusFilter} tasks.` : 'Create your first task to get started.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
