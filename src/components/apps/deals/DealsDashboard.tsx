"use client";

import React from 'react';
import { 
  TrendingUp, DollarSign, Target, 
  BarChart3, Activity, Briefcase 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDealsStore } from '@/stores/dealsStore';

export const DealsDashboard = () => {
  const { deals } = useDealsStore();

  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = deals.reduce((sum, d) => sum + (d.value * (d.probability / 100)), 0);
  const wonDeals = deals.filter(d => d.stage === 'Won');
  const conversionRate = deals.length > 0 ? (wonDeals.length / deals.length) * 100 : 0;
  const avgDealSize = deals.length > 0 ? totalValue / deals.length : 0;

  const metrics = [
    { 
      label: 'Pipeline Value', 
      value: `$${totalValue.toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-gold',
      trend: '+12% from last month'
    },
    { 
      label: 'Weighted Value', 
      value: `$${Math.round(weightedValue).toLocaleString()}`, 
      icon: Target, 
      color: 'text-blue-400',
      trend: 'Based on probability'
    },
    { 
      label: 'Avg. Deal Size', 
      value: `$${Math.round(avgDealSize).toLocaleString()}`, 
      icon: BarChart3, 
      color: 'text-purple-400',
      trend: 'Active deals'
    },
    { 
      label: 'Conversion', 
      value: `${conversionRate.toFixed(1)}%`, 
      icon: TrendingUp, 
      color: 'text-green-400',
      trend: 'Won/Total'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="p-5 glass border border-gold/10 rounded-2xl group hover:border-gold/30 transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className={cn("p-2 rounded-lg bg-white/5 border border-gold/5 transition-colors group-hover:bg-gold/10", metric.color)}>
              <metric.icon size={20} />
            </div>
            <span className="text-[10px] text-text-secondary/50 font-medium">{metric.trend}</span>
          </div>
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">{metric.label}</p>
          <h3 className="text-2xl font-display font-bold text-text-primary">{metric.value}</h3>
        </div>
      ))}
    </div>
  );
};
