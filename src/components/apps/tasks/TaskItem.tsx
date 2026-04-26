"use client";

import React, { useState } from 'react';
import { Check, Circle, Clock, AlertCircle, ChevronDown, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Task } from '@/types';
import { useTasksStore } from '@/stores/tasksStore';

interface TaskItemProps {
  task: Task;
}

const priorityConfig: Record<Task['priority'], { label: string; color: string; icon: React.ElementType }> = {
  low: { label: 'Low', color: 'text-blue-400', icon: ChevronDown },
  medium: { label: 'Medium', color: 'text-yellow-400', icon: Clock },
  high: { label: 'High', color: 'text-orange-400', icon: AlertCircle },
  urgent: { label: 'Urgent', color: 'text-os-red', icon: AlertCircle },
};

export const TaskItem = ({ task }: TaskItemProps) => {
  const { updateTask, removeTask } = useTasksStore();
  const [isHovered, setIsHovered] = useState(false);

  const isDone = task.status === 'done';
  const priority = priorityConfig[task.priority];
  const PriorityIcon = priority.icon;

  const cycleStatus = async () => {
    const next: Record<Task['status'], Task['status']> = {
      todo: 'in-progress',
      'in-progress': 'done',
      done: 'todo',
    };
    const newStatus = next[task.status];
    updateTask(task.id, { status: newStatus });
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      // revert on error
      updateTask(task.id, { status: task.status });
    }
  };

  const handleDelete = async () => {
    removeTask(task.id);
    try {
      await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'flex items-start space-x-3 p-4 rounded-xl border transition-all group',
        isDone
          ? 'bg-white/2 border-gold/5 opacity-50'
          : 'bg-white/5 border-gold/10 hover:border-gold/25 hover:bg-white/8'
      )}
    >
      {/* Status Toggle */}
      <button
        onClick={cycleStatus}
        className={cn(
          'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
          isDone
            ? 'bg-green-500 border-green-500'
            : task.status === 'in-progress'
            ? 'border-gold bg-gold/20'
            : 'border-text-secondary/30 hover:border-gold'
        )}
      >
        {isDone && <Check size={10} className="text-white" strokeWidth={3} />}
        {task.status === 'in-progress' && <div className="w-1.5 h-1.5 rounded-full bg-gold" />}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm font-medium leading-snug',
            isDone ? 'line-through text-text-secondary' : 'text-text-primary'
          )}>
            {task.title}
          </p>
          <div className={cn(
            'flex items-center space-x-1 flex-shrink-0 transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}>
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-os-red/20 text-text-secondary hover:text-os-red transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {task.description && (
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{task.description}</p>
        )}

        <div className="flex items-center space-x-3 mt-2">
          <span className={cn('flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider', priority.color)}>
            <PriorityIcon size={10} />
            <span>{priority.label}</span>
          </span>

          {task.due_date && (
            <span className={cn(
              'flex items-center space-x-1 text-[10px] font-medium',
              isOverdue ? 'text-os-red' : 'text-text-secondary'
            )}>
              <Clock size={10} />
              <span>{new Date(task.due_date).toLocaleDateString()}</span>
              {isOverdue && <span className="font-bold">Overdue</span>}
            </span>
          )}

          {task.status === 'in-progress' && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">
              In Progress
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
