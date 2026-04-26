"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '@/stores/toastStore';
import { cn } from '@/lib/utils';

const ICONS = { success: Check, error: AlertCircle, info: Info };
const COLORS = {
  success: 'border-green-500/40 text-green-400',
  error:   'border-os-red/40 text-os-red',
  info:    'border-gold/40 text-gold',
};

export const ToastContainer = () => {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-24 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className={cn(
                'pointer-events-auto flex items-center space-x-3 px-4 py-3 rounded-xl glass border shadow-2xl min-w-[220px] max-w-[360px]',
                COLORS[t.type]
              )}
            >
              <Icon size={15} className="flex-shrink-0" />
              <span className="text-sm font-medium text-text-primary flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
