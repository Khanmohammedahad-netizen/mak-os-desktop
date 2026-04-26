import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  className?: string;
  size?: 'sm' | 'md';
}

const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-white/10 text-text-secondary border-white/10',
  gold: 'bg-gold/10 text-gold border-gold/20',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export const Badge = ({ children, variant = 'default', className, size = 'sm' }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center font-bold border rounded-full uppercase tracking-wider',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
