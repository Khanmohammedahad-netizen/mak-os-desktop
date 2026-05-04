import React, { useEffect, useState } from 'react';
import { Send, Mail, MessageSquare, Phone, Wand2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOutreachStore } from '@/stores/outreachStore';
import { Lead } from '@/stores/leadMineStore';

export const OutreachApp = () => {
  const { auditedLeads, fetchAuditedLeads, isLoading } = useOutreachStore();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchAuditedLeads();
  }, [fetchAuditedLeads]);

  useEffect(() => {
    if (auditedLeads.length > 0 && !selectedLead) {
      setSelectedLead(auditedLeads[0]);
    }
  }, [auditedLeads, selectedLead]);

  return (
    <div className="flex h-full w-full bg-bg-primary text-text-primary overflow-hidden">
      <div className="w-80 border-r border-gold/10 bg-bg-surface/30 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-xl font-display text-gold flex items-center gap-2">
            <Send className="w-5 h-5" />
            Outreach Queue
          </h2>
          <div className="text-sm text-text-secondary mt-1">{auditedLeads.length} leads ready to contact</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="p-4 text-sm text-text-secondary text-center">Loading queue...</div>
          ) : auditedLeads.length === 0 ? (
            <div className="p-4 text-sm text-text-secondary text-center">Queue is empty</div>
          ) : (
            auditedLeads.map((lead) => (
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
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded font-bold",
                    lead.lead_score >= 61 ? "bg-green-500/20 text-green-400" : lead.lead_score >= 31 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {lead.lead_score}
                  </span>
                  <span className="text-xs text-text-secondary truncate">{lead.category}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-black p-6">
        {selectedLead ? (
          <OutreachWorkspace lead={selectedLead} onSendComplete={() => setSelectedLead(null)} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-text-secondary">
            <Send className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a lead to begin outreach</p>
          </div>
        )}
      </div>
    </div>
  );
};

const OutreachWorkspace = ({ lead, onSendComplete }: { lead: Lead, onSendComplete: () => void }) => {
  const { isGenerating, currentMessage, generateMessage, isSending, sendMessage } = useOutreachStore();
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'call'>('email');
  const [editableMessage, setEditableMessage] = useState('');

  useEffect(() => {
    setEditableMessage(currentMessage);
  }, [currentMessage]);

  const auditData = lead.audit_data as any;

  const handleSend = async () => {
    if (!editableMessage) return;
    await sendMessage(lead.id, channel, editableMessage);
    onSendComplete();
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-display text-white">{lead.business_name}</h1>
          <div className="flex items-center gap-4 mt-2">
            {lead.email && <div className="text-sm text-text-secondary flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {lead.email}</div>}
            {lead.phone_normalized && <div className="text-sm text-text-secondary flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {lead.phone_normalized}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-secondary uppercase tracking-wider mb-1">Audit Score</div>
          <div className={cn(
            "text-3xl font-bold font-display",
            lead.lead_score >= 61 ? "text-green-400" : lead.lead_score >= 31 ? "text-amber-400" : "text-red-400"
          )}>{lead.lead_score}/100</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column: Context */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-3">Audit Highlights</h3>
            {auditData ? (
              <ul className="space-y-2 text-sm text-text-secondary">
                {auditData.pain_points?.map((point: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <ArrowRight className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
                {auditData.pain_points?.length === 0 && <li>No specific pain points detected.</li>}
              </ul>
            ) : (
              <div className="text-sm text-text-secondary">No audit data available.</div>
            )}
          </div>

          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-3">Channel</h3>
            <div className="flex flex-col gap-2">
              <ChannelButton 
                active={channel === 'email'} 
                onClick={() => setChannel('email')}
                icon={<Mail className="w-4 h-4" />} 
                label="Email" 
                available={!!lead.email}
              />
              <ChannelButton 
                active={channel === 'whatsapp'} 
                onClick={() => setChannel('whatsapp')}
                icon={<MessageSquare className="w-4 h-4" />} 
                label="WhatsApp" 
                available={!!lead.phone_normalized}
              />
              <ChannelButton 
                active={channel === 'call'} 
                onClick={() => setChannel('call')}
                icon={<Phone className="w-4 h-4" />} 
                label="AI Voice Call" 
                available={!!lead.phone_normalized}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Composer */}
        <div className="col-span-2 flex flex-col gap-4">
          <div className="bg-[#111] border border-[#222] rounded-xl p-6 flex flex-col gap-4 h-full">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-white">Message Composer</h3>
              <button 
                onClick={() => generateMessage(lead.id)}
                disabled={isGenerating}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-sm transition-colors border border-white/10"
              >
                <Wand2 className={cn("w-4 h-4 text-gold", isGenerating && "animate-spin")} />
                {isGenerating ? 'Generating...' : 'AI Generate'}
              </button>
            </div>

            <textarea
              value={editableMessage}
              onChange={e => setEditableMessage(e.target.value)}
              placeholder="Click 'AI Generate' or start typing your message..."
              className="flex-1 bg-black border border-[#333] rounded-lg p-4 text-sm text-white resize-none focus:border-gold/50 outline-none"
            />

            <button 
              onClick={handleSend}
              disabled={isSending || !editableMessage}
              className="w-full flex items-center justify-center gap-2 bg-gold text-black font-medium py-3 rounded-lg hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Sending...' : `Send via ${channel}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChannelButton = ({ active, onClick, icon, label, available }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, available: boolean }) => (
  <button 
    onClick={onClick}
    disabled={!available}
    className={cn(
      "w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors border",
      active ? "bg-gold/10 border-gold/30 text-white" : "bg-black border-[#333] text-text-secondary hover:bg-white/5 hover:border-white/10",
      !available && "opacity-50 cursor-not-allowed hover:bg-black hover:border-[#333]"
    )}
  >
    {icon} {label} {!available && <span className="ml-auto text-xs opacity-50">Unavailable</span>}
  </button>
);
