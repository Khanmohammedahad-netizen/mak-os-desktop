import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: { value: number; label: string };
  icon: React.ElementType;
  iconColor?: string;
  className?: string;
}

export const MetricCard = ({ label, value, trend, icon: Icon, iconColor = 'text-gold', className }: MetricCardProps) => {
  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  const trendColor = trend
    ? trend.value > 0
      ? 'text-green-400'
      : trend.value < 0
      ? 'text-os-red'
      : 'text-text-secondary'
    : '';

  return (
    <div className={cn(
      'p-5 glass border border-gold/10 rounded-2xl group hover:border-gold/30 transition-all',
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn(
          'p-2 rounded-lg bg-white/5 border border-gold/5 group-hover:bg-gold/10 transition-colors',
          iconColor
        )}>
          <Icon size={20} />
        </div>
        {trend && TrendIcon && (
          <div className={cn('flex items-center space-x-1 text-[10px] font-bold', trendColor)}>
            <TrendIcon size={12} />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-2xl font-display font-bold text-text-primary">{value}</h3>
      {trend && (
        <p className="text-[10px] text-text-secondary mt-1 opacity-60">{trend.label}</p>
      )}
    </div>
  );
};
