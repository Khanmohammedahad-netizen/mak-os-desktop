"use client";

import React, { useEffect, useState } from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCRMStore } from '@/stores/crmStore';

const STAGES = ['New', 'Contacted', 'Meeting Set', 'Demo Given', 'Proposal Sent', 'Won', 'Lost'];

const daysSince = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getTopBorderClass = (stage: string, isHovered: boolean) => {
  if (isHovered) return 'border-t-gold/60';
  if (stage === 'Won') return 'border-t-green-500/50';
  if (stage === 'Lost') return 'border-t-red-500/50';
  return 'border-t-gold/5';
};

export const LeadPipeline = () => {
  const { contacts, setContacts, setLoading, updateContactStatus, setActiveContactId } = useCRMStore();
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/contacts');
        const data = await res.json();
        if (Array.isArray(data)) setContacts(data);
      } catch (err) {
        console.error('Failed to fetch contacts for pipeline:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, [setContacts, setLoading]);

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('contactId', id);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const onDrop = async (e: React.DragEvent, stage: string) => {
    const id = e.dataTransfer.getData('contactId');
    if (!id) return;
    updateContactStatus(id, stage);
    setHoveredStage(null);
    try {
      await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: stage }),
      });
    } catch (err) {
      console.error('Failed to update contact status:', err);
    }
  };

  return (
    <div className="flex h-full overflow-x-auto p-6 space-x-4 bg-black/20">
      {STAGES.map((stage) => {
        const stageContacts = contacts.filter((c) => c.status === stage);
        const totalValue = stageContacts.reduce((sum, c) => sum + (c.deal_value ?? 0), 0);
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
              'flex-shrink-0 w-64 flex flex-col rounded-t-lg border-t-2 transition-colors duration-200',
              getTopBorderClass(stage, isHovered)
            )}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1 pt-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">{stage}</h3>
                <span className="bg-white/5 text-[10px] px-1.5 py-0.5 rounded border border-gold/10 text-gold-light">
                  {stageContacts.length}
                </span>
              </div>
              {totalValue > 0 && (
                <div className="text-[11px] text-gold/60 font-medium">
                  ${totalValue.toLocaleString()}
                </div>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-3 overflow-y-auto pb-20 scrollbar-hide">
              {stageContacts.map((contact) => (
                <div
                  key={contact.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, contact.id)}
                  onClick={() => setActiveContactId(contact.id)}
                  className="p-3.5 glass border border-gold/5 rounded-xl cursor-grab active:cursor-grabbing hover:border-gold/30 hover:bg-white/5 transition-all group"
                >
                  <div className="mb-1.5">
                    <h4 className="text-[13px] font-semibold text-text-primary group-hover:text-gold transition-colors truncate">
                      {contact.name}
                    </h4>
                    <p className="text-[11px] text-text-secondary truncate">{contact.company || 'Private'}</p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-1 text-[11px] text-gold font-medium">
                      <DollarSign size={10} />
                      <span>{contact.deal_value ? Number(contact.deal_value).toLocaleString() : '0'}</span>
                    </div>
                    <span className="text-[10px] text-text-secondary">
                      {daysSince(contact.created_at)}d ago
                    </span>
                  </div>
                </div>
              ))}

              <div className={cn(
                'h-16 border-2 border-dashed rounded-xl flex items-center justify-center transition-colors duration-150',
                isHovered ? 'border-gold/30 bg-gold/5' : 'border-gold/5'
              )}>
                <Plus size={14} className={isHovered ? 'text-gold/40' : 'text-text-secondary/20'} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
