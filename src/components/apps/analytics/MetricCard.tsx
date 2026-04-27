import React from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconColor?: string;
}

export const MetricCard = ({ label, value, sub, icon: Icon, iconColor = 'text-gold' }: MetricCardProps) => (
  <div
    className="flex flex-col p-5 rounded-2xl border border-gold/10 border-t-[2.5px] border-t-gold/40 hover:border-t-gold/70 transition-all group"
    style={{ backgroundColor: '#111113' }}
  >
    <div className={cn('p-2 rounded-lg bg-white/5 border border-gold/5 w-fit group-hover:bg-gold/10 transition-colors mb-4', iconColor)}>
      <Icon size={18} />
    </div>
    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">{label}</p>
    <h3
      className="font-display font-bold text-text-primary leading-none"
      style={{ fontSize: '36px', fontFamily: 'var(--font-display, "Cormorant Garamond", serif)' }}
    >
      {value}
    </h3>
    {sub && <p className="text-[10px] text-text-secondary/60 mt-1.5">{sub}</p>}
  </div>
);
