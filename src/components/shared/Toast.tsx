"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '@/stores/toastStore';
import { cn } from '@/lib/utils';

const ICONS = { success: Check, error: AlertCircle, info: Info };

const BORDER_COLORS = {
  success: 'border-l-green-500/70',
  error:   'border-l-os-red/70',
  info:    'border-l-gold/70',
};

const TEXT_COLORS = {
  success: 'text-green-400',
  error:   'text-os-red',
  info:    'text-gold',
};

export const ToastContainer = () => {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed top-[36px] right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 80, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className={cn(
                'pointer-events-auto flex items-center gap-3 pl-4 pr-4 py-3 rounded-xl glass border border-gold/10 border-l-[3px] shadow-2xl min-w-[240px] max-w-[360px]',
                BORDER_COLORS[t.type]
              )}
            >
              <Icon size={14} className={cn('flex-shrink-0', TEXT_COLORS[t.type])} />
              <span className="text-[13px] font-medium text-text-primary flex-1 leading-snug">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-text-secondary/50 hover:text-text-secondary transition-colors flex-shrink-0 ml-1"
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
