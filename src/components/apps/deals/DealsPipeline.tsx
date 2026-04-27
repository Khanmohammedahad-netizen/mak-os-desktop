"use client";

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDealsStore } from '@/stores/dealsStore';
import { useToastStore } from '@/stores/toastStore';
import { DealCard } from './DealCard';

const STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const topBorder = (stage: string, hovered: boolean) => {
  if (hovered) return 'border-t-gold/60';
  if (stage === 'Closed Won') return 'border-t-green-500/50';
  if (stage === 'Closed Lost') return 'border-t-red-500/50';
  return 'border-t-gold/10';
};

export const DealsPipeline = () => {
  const { deals, updateDealStage, setActiveDealId } = useDealsStore();
  const { toast } = useToastStore();
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('dealId', id);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const onDrop = async (e: React.DragEvent, stage: string) => {
    const id = e.dataTransfer.getData('dealId');
    if (!id) return;
    updateDealStage(id, stage);
    setHoveredStage(null);
    toast(`Deal moved to ${stage}`, stage === 'Closed Won' ? 'success' : 'info');
    if (isMock) return;
    try {
      await fetch(`/api/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
    } catch (err) {
      console.error('Failed to update deal stage:', err);
    }
  };

  return (
    <div className="flex h-full overflow-x-auto p-4 gap-3 bg-black/10">
      {STAGES.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage);
        const totalValue = stageDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);
        const isHovered = hoveredStage === stage;

        return (
          <div
            key={stage}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, stage)}
            onDragEnter={() => setHoveredStage(stage)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setHoveredStage(null);
              }
            }}
            className={cn(
              'flex-shrink-0 w-[195px] flex flex-col rounded-t-lg border-t-2 transition-colors duration-200',
              topBorder(stage, isHovered)
            )}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1 pt-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                  {stage}
                </h3>
                <span className="bg-white/5 text-[10px] px-1.5 py-0.5 rounded border border-gold/10 text-gold/70">
                  {stageDeals.length}
                </span>
              </div>
              {totalValue > 0 && (
                <span className="text-[10px] text-gold/60 font-medium">
                  ${totalValue.toLocaleString()}
                </span>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2.5 overflow-y-auto pb-10 scrollbar-hide">
              {stageDeals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal as Parameters<typeof DealCard>[0]['deal']}
                  onSelect={(id) => setActiveDealId(id)}
                  onDragStart={onDragStart}
                />
              ))}

              <div
                className={cn(
                  'h-14 border-2 border-dashed rounded-xl flex items-center justify-center transition-colors duration-150',
                  isHovered ? 'border-gold/30 bg-gold/5' : 'border-gold/5'
                )}
              >
                <Plus size={14} className={isHovered ? 'text-gold/40' : 'text-text-secondary/20'} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
