import React, { useEffect, useState } from 'react';
import { ScanSearch, ExternalLink, AlertTriangle, CheckCircle2, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeadAuditStore } from '@/stores/leadAuditStore';
import { Lead } from '@/stores/leadMineStore'; // Reusing type

export const LeadAuditApp = () => {
  const { unAuditedLeads, fetchUnauditedLeads, isLoading } = useLeadAuditStore();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchUnauditedLeads();
  }, [fetchUnauditedLeads]);

  useEffect(() => {
    if (unAuditedLeads.length > 0 && !selectedLead) {
      setSelectedLead(unAuditedLeads[0]);
    }
  }, [unAuditedLeads, selectedLead]);

  return (
    <div className="flex h-full w-full bg-bg-primary text-text-primary overflow-hidden">
      <div className="w-80 border-r border-gold/10 bg-bg-surface/30 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <ScanSearch className="w-5 h-5" />
            Audit Queue
          </h2>
          <div className="text-sm text-text-secondary mt-1">{unAuditedLeads.length} leads await audit</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="p-4 text-sm text-text-secondary text-center">Loading queue...</div>
          ) : unAuditedLeads.length === 0 ? (
            <div className="p-4 text-sm text-text-secondary text-center flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-green-500/50" />
              All caught up!
            </div>
          ) : (
            unAuditedLeads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors border",
                  selectedLead?.id === lead.id 
                    ? "bg-gold/10 border-gold/30" 
                    : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                )}
              >
                <div className="font-medium text-white truncate text-sm">{lead.business_name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-text-secondary truncate">{lead.website ? lead.website.replace(/^https?:\/\//, '') : 'No website'}</span>
                  {lead.google_rating && <span className="text-xs text-gold">{lead.google_rating} ★</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-black p-6">
        {selectedLead ? (
          <AuditWorkspace lead={selectedLead} onAuditComplete={() => setSelectedLead(null)} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary">
            <ScanSearch className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a lead to begin auditing</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AuditWorkspace = ({ lead, onAuditComplete }: { lead: Lead, onAuditComplete: () => void }) => {
  const { isAuditing, currentAuditLeadId, runAudit } = useLeadAuditStore();
  const isCurrentlyAuditing = isAuditing && currentAuditLeadId === lead.id;

  const handleAudit = async () => {
    await runAudit(lead.id, lead.website);
    onAuditComplete();
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-display text-white">{lead.business_name}</h1>
          <div className="flex items-center gap-3 mt-2 text-text-secondary">
            <span className="text-sm">{lead.category}</span>
            <span>•</span>
            <span className="text-sm">{lead.city}, {lead.country}</span>
          </div>
        </div>
        {lead.website ? (
          <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-white/10">
            View Website <ExternalLink className="w-4 h-4" />
          </a>
        ) : (
          <div className="text-red-400 text-sm flex items-center gap-2 bg-red-400/10 px-4 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4" /> No Website
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Website Preview Placeholder */}
        <div className="aspect-video bg-[#111] rounded-xl border border-[#222] flex items-center justify-center overflow-hidden relative">
          {lead.website ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary">
              <span className="text-sm mb-2">Live Preview Placeholder</span>
              <span className="text-xs opacity-50">{lead.website}</span>
            </div>
          ) : (
            <div className="text-text-secondary text-sm">No website available to preview</div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-6">
            <h3 className="text-lg font-medium text-white mb-2">Audit Action</h3>
            <p className="text-sm text-text-secondary mb-6">
              Run an automated PageSpeed Insights audit to detect technical flaws, slow load times, and missing SEO metrics. This data will be used to generate the outreach message.
            </p>
            
            <button 
              onClick={handleAudit}
              disabled={isCurrentlyAuditing || !lead.website}
              className="w-full flex items-center justify-center gap-2 bg-gold text-black font-medium py-3 rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCurrentlyAuditing ? (
                <>
                  <RotateCw className="w-5 h-5 animate-spin" />
                  Running Automated Audit...
                </>
              ) : (
                <>
                  <ScanSearch className="w-5 h-5" />
                  {lead.website ? 'Run PageSpeed Audit' : 'Requires Website'}
                </>
              )}
            </button>
          </div>

          <div className="bg-[#111] border border-[#222] rounded-xl p-4 flex flex-col gap-3">
            <div className="text-sm font-medium text-white">Manual Observations</div>
            <textarea 
              placeholder="Jot down any specific visual issues you notice (e.g., pixelated logo, broken layout on mobile)..." 
              className="bg-black border border-[#333] rounded-lg p-3 text-sm text-white resize-none h-24 focus:border-gold/50 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
