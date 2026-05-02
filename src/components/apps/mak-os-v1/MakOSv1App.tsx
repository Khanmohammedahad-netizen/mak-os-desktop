"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { OutreachApp } from '../outreach/OutreachApp';
import { WhatsAppApp } from '../whatsapp/WhatsAppApp';
import { EmailApp } from '../email/EmailApp';
import { VoiceApp } from '../voice/VoiceApp';
import { LeadsApp } from '../leads/LeadsApp';

const TABS = ['Leads', 'Outreach', 'WhatsApp', 'Email', 'Voice'] as const;
type Tab = typeof TABS[number];

export const MakOSv1App = () => {
  const [tab, setTab] = useState<Tab>('Leads');

  return (
    <div className="flex flex-col h-full bg-bg-surface/30">
      <div className="flex border-b border-gold/10 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-medium transition-colors',
              tab === t
                ? 'text-gold border-b-2 border-gold -mb-px'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'Leads'    && <LeadsApp />}
        {tab === 'Outreach' && <OutreachApp />}
        {tab === 'WhatsApp' && <WhatsAppApp />}
        {tab === 'Email'    && <EmailApp />}
        {tab === 'Voice'    && <VoiceApp />}
      </div>
    </div>
  );
};
