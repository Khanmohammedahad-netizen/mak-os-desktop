"use client";

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal, DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCRMStore } from '@/stores/crmStore';
import { Contact } from '@/types';

const STAGES = [
  'New',
  'Contacted',
  'Meeting Set',
  'Demo Given',
  'Proposal Sent',
  'Negotiating',
  'Won',
  'Lost'
];

export const LeadPipeline = () => {
  const { contacts, setContacts, setLoading, updateContactStatus, setActiveContactId } = useCRMStore();

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/contacts');
        const data = await response.json();
        if (Array.isArray(data)) {
          setContacts(data);
        }
      } catch (error) {
        console.error('Failed to fetch contacts for pipeline:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [setContacts, setLoading]);

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('contactId', id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent, stage: string) => {
    const id = e.dataTransfer.getData('contactId');
    updateContactStatus(id, stage);

    try {
      await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: stage }),
      });
    } catch (error) {
      console.error('Failed to update contact status:', error);
    }
  };

  return (
    <div className="flex h-full overflow-x-auto p-6 space-x-4 bg-black/20">
      {STAGES.map((stage) => {
        const stageContacts = contacts.filter((c) => c.status === stage);
        const totalValue = stageContacts.reduce((sum, c) => sum + (c.deal_value || 0), 0);

        return (
          <div
            key={stage}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, stage)}
            className="flex-shrink-0 w-72 flex flex-col"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-[12px] font-bold uppercase tracking-widest text-text-secondary">{stage}</h3>
                <span className="bg-white/5 text-[10px] px-1.5 py-0.5 rounded border border-gold/10 text-gold-light">
                  {stageContacts.length}
                </span>
              </div>
              <div className="text-[11px] text-gold/60 font-medium">
                ${totalValue.toLocaleString()}
              </div>
            </div>

            {/* Cards List */}
            <div className="flex-1 space-y-3 overflow-y-auto pb-20 scrollbar-hide">
              {stageContacts.map((contact) => (
                <div
                  key={contact.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, contact.id)}
                  onClick={() => setActiveContactId(contact.id)}
                  className="p-4 glass border border-gold/5 rounded-xl cursor-grab active:cursor-grabbing hover:border-gold/30 hover:bg-white/5 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-[13px] font-semibold text-text-primary group-hover:text-gold transition-colors truncate flex-1">
                      {contact.name}
                    </h4>
                    <button className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                  <p className="text-[11px] text-text-secondary mb-3 truncate">{contact.company || 'Private'}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-[11px] text-gold font-medium">
                      <DollarSign size={10} />
                      <span>{contact.deal_value ? contact.deal_value.toLocaleString() : '0'}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] text-text-secondary">
                      <Clock size={10} />
                      <span>{contact.source}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Empty State placeholder for drop target area */}
              <div className="h-20 border-2 border-dashed border-gold/5 rounded-xl flex items-center justify-center text-text-secondary/20 group-hover:border-gold/10 transition-colors">
                <Plus size={16} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Plus = ({ className, size }: { className?: string; size?: number }) => (
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
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);
