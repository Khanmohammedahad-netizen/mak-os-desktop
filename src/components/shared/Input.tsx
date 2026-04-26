import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && <label className="text-xs font-medium text-text-secondary ml-1">{label}</label>}
        <input
          ref={ref}
          className={cn(
            'w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50',
            'focus:outline-none focus:ring-1 focus:ring-gold/50 focus:border-gold/50 transition-all',
            error && 'border-os-red/50 focus:ring-os-red/50 focus:border-os-red/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-[10px] text-os-red ml-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
