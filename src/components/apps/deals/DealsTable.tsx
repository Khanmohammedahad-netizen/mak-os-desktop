"use client";

import React from 'react';
import { 
  MoreHorizontal, Calendar, 
  User, ArrowUpRight, AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDealsStore } from '@/stores/dealsStore';
import { useWindowStore } from '@/stores/windowStore';

export const DealsTable = () => {
  const { deals, loading } = useDealsStore();
  const { openWindow } = useWindowStore();

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'new': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'contacted': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'proposal sent': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'won': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'lost': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-text-secondary bg-white/5 border-white/10';
    }
  };

  const isAtRisk = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  if (loading && deals.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="glass border border-gold/10 rounded-2xl overflow-hidden shadow-xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-white/5 border-b border-gold/10 text-[10px] uppercase tracking-widest text-text-secondary font-bold">
            <th className="py-4 px-6">Opportunity</th>
            <th className="py-4 px-6">Value</th>
            <th className="py-4 px-6">Probability</th>
            <th className="py-4 px-6">Stage</th>
            <th className="py-4 px-6">Exp. Close</th>
            <th className="py-4 px-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="text-[13px]">
          {deals.map((deal) => (
            <tr 
              key={deal.id}
              className="border-b border-gold/5 hover:bg-white/5 transition-colors group cursor-default"
            >
              <td className="py-5 px-6">
                <div className="flex flex-col">
                  <span className="font-semibold text-text-primary group-hover:text-gold transition-colors">{deal.title}</span>
                  <button 
                    onClick={() => openWindow('crm', 'CRM')}
                    className="flex items-center space-x-1 text-[11px] text-text-secondary hover:text-gold-light mt-0.5 transition-colors w-fit"
                  >
                    <User size={10} />
                    <span>View Contact</span>
                  </button>
                </div>
              </td>
              <td className="py-5 px-6">
                <span className="text-gold font-medium">${deal.value.toLocaleString()}</span>
              </td>
              <td className="py-5 px-6">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 h-1.5 w-16 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gold transition-all duration-1000" 
                      style={{ width: `${deal.probability}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-text-secondary">{deal.probability}%</span>
                </div>
              </td>
              <td className="py-5 px-6">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                  getStageColor(deal.stage)
                )}>
                  {deal.stage}
                </span>
              </td>
              <td className="py-5 px-6">
                <div className="flex flex-col">
                  <span className={cn(
                    "font-medium",
                    isAtRisk(deal.expected_close_date) && deal.stage !== 'Won' ? "text-os-red" : "text-text-secondary"
                  )}>
                    {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString() : 'TBD'}
                  </span>
                  {isAtRisk(deal.expected_close_date) && deal.stage !== 'Won' && (
                    <span className="flex items-center space-x-1 text-[9px] text-os-red/60 uppercase font-bold mt-0.5">
                      <AlertCircle size={8} />
                      <span>At Risk</span>
                    </span>
                  )}
                </div>
              </td>
              <td className="py-5 px-6 text-right">
                <button className="p-2 hover:bg-white/10 rounded-lg text-text-secondary transition-colors">
                  <MoreHorizontal size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {deals.length === 0 && !loading && (
        <div className="py-20 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-gold/5 rounded-full flex items-center justify-center mb-4 border border-gold/10">
            <BriefcaseIcon className="text-gold/20" size={32} />
          </div>
          <h4 className="text-text-primary font-medium">No active deals</h4>
          <p className="text-text-secondary text-xs mt-1">Create your first deal to start tracking pipeline health.</p>
        </div>
      )}
    </div>
  );
};

const BriefcaseIcon = ({ className, size }: { className?: string; size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);
