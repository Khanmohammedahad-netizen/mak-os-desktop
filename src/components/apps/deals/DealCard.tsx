"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Deal } from '@/types';

interface DealCardProps {
  deal: Deal & { contact_name?: string };
  onSelect: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

const probColor = (p: number) => {
  if (p < 30) return 'text-red-400 bg-red-500/10';
  if (p <= 60) return 'text-yellow-400 bg-yellow-500/10';
  return 'text-green-400 bg-green-500/10';
};

const fmt = (val: number | null, currency = 'USD') => {
  if (!val) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(val);
  } catch {
    return `${currency} ${val.toLocaleString()}`;
  }
};

export const DealCard = ({ deal, onSelect, onDragStart }: DealCardProps) => (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, deal.id)}
    onClick={() => onSelect(deal.id)}
    className="p-3.5 rounded-xl cursor-grab active:cursor-grabbing hover:border-gold/30 transition-all group border border-gold/10 border-l-[3px] border-l-gold/30"
    style={{ backgroundColor: '#111113' }}
  >
    <h4 className="text-[13px] font-semibold text-text-primary group-hover:text-gold transition-colors truncate mb-0.5">
      {deal.title}
    </h4>

    {deal.contact_name && (
      <p className="text-[11px] text-text-secondary truncate mb-2">{deal.contact_name}</p>
    )}

    <div className="flex items-center justify-between mt-2">
      <span className="text-[12px] font-medium text-gold">
        {fmt(deal.value, deal.currency)}
      </span>
      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', probColor(deal.probability))}>
        {deal.probability}%
      </span>
    </div>
  </div>
);
