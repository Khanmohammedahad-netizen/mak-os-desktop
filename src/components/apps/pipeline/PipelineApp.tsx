import React, { useEffect } from 'react';
import { Kanban, GripVertical, MoreVertical, Building2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipelineStore, PIPELINE_STAGES } from '@/stores/pipelineStore';
import { Lead } from '@/stores/leadMineStore';

export const PipelineApp = () => {
  const { pipelineLeads, fetchPipelineLeads, updateLeadStatus, isLoading } = usePipelineStore();

  useEffect(() => {
    fetchPipelineLeads();
  }, [fetchPipelineLeads]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      updateLeadStatus(leadId, stageId);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary text-text-primary overflow-hidden">
      <div className="h-14 border-b border-white/5 flex items-center px-6 shrink-0 bg-bg-surface/30">
        <h2 className="text-xl font-display text-gold flex items-center gap-2">
          <Kanban className="w-5 h-5" />
          Sales Pipeline
        </h2>
        <div className="ml-4 text-xs text-text-secondary bg-black px-3 py-1 rounded-full border border-white/10">
          {pipelineLeads.length} active leads
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-6 h-full items-start min-w-max pb-4">
          {PIPELINE_STAGES.map(stage => (
            <div 
              key={stage.id} 
              className="w-80 h-full flex flex-col bg-[#111]/50 border border-[#222] rounded-xl overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="p-3 border-b border-[#222] flex items-center justify-between bg-[#111]">
                <div className={cn("px-2.5 py-1 text-xs font-bold rounded border", stage.color)}>
                  {stage.label}
                </div>
                <div className="text-xs text-text-secondary">
                  {pipelineLeads.filter(l => l.status === stage.id).length}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                {isLoading && pipelineLeads.length === 0 ? (
                  <div className="text-center text-text-secondary text-xs p-4">Loading...</div>
                ) : (
                  pipelineLeads
                    .filter(l => l.status === stage.id)
                    .map(lead => (
                      <PipelineCard 
                        key={lead.id} 
                        lead={lead} 
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                      />
                    ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const PipelineCard = ({ lead, onDragStart }: { lead: Lead, onDragStart: (e: React.DragEvent) => void }) => {
  return (
    <div 
      draggable
      onDragStart={onDragStart}
      className="bg-[#1a1a1a] border border-[#333] hover:border-gold/30 rounded-lg p-4 cursor-grab active:cursor-grabbing transition-colors group relative"
    >
      <button className="absolute top-3 right-3 text-text-secondary opacity-0 group-hover:opacity-100 hover:text-white transition-opacity">
        <MoreVertical className="w-4 h-4" />
      </button>

      <div className="flex gap-2 items-start">
        <GripVertical className="w-4 h-4 text-text-secondary/30 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white truncate text-sm">{lead.business_name}</div>
          
          <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-2">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{lead.category}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{lead.city}, {lead.country}</span>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded font-bold",
              lead.lead_score >= 61 ? "bg-green-500/10 text-green-400" : lead.lead_score >= 31 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
            )}>
              Score: {lead.lead_score}
            </span>
            {lead.email && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Email Available" />}
            {lead.phone_normalized && <div className="w-1.5 h-1.5 rounded-full bg-green-400" title="Phone Available" />}
          </div>
        </div>
      </div>
    </div>
  );
};
