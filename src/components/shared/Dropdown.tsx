"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface DropdownProps {
  items: DropdownItem[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export const Dropdown = ({
  items,
  value,
  onChange,
  placeholder = 'Select...',
  className,
  triggerClassName,
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = items.find((item) => item.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 text-sm',
          'bg-white/5 border border-gold/10 rounded-lg text-text-primary',
          'focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-all',
          'hover:bg-white/10',
          triggerClassName
        )}
      >
        <span className={cn(selected ? 'text-text-primary' : 'text-text-secondary/50')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={cn('text-text-secondary transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full glass border border-gold/20 rounded-xl shadow-2xl overflow-hidden"
          >
            {items.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  onChange?.(item.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center space-x-2 px-3 py-2 text-sm text-left transition-colors',
                  item.danger
                    ? 'text-os-red hover:bg-os-red/10'
                    : 'text-text-secondary hover:bg-white/10 hover:text-text-primary',
                  value === item.value && 'bg-gold/10 text-gold'
                )}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
