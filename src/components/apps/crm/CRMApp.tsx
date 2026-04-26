"use client";

import React, { useState } from 'react';
import { Plus, Users as UsersIcon, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { ContactsTable } from './ContactsTable';
import { LeadPipeline } from './LeadPipeline';
import { AddContactForm } from './AddContactForm';
import { ContactDetail } from './ContactDetail';
import { useCRMStore } from '@/stores/crmStore';
import { Contact } from '@/types';

const STATUS_FILTERS = [
  'All', 'New', 'Contacted', 'Meeting Set',
  'Demo Given', 'Proposal Sent', 'Won', 'Lost',
];

export const CRMApp = () => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'pipeline'>('contacts');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { activeContactId, setActiveContactId } = useCRMStore();

  const openAdd = () => { setEditContact(null); setShowAddModal(true); };
  const openEdit = (c: Contact) => { setEditContact(c); setShowAddModal(true); };

  return (
    <div className="flex flex-col h-full bg-bg-surface/50">
      {/* Tab Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gold/10 bg-white/5 flex-shrink-0">
        <div className="flex items-center space-x-6">
          {(['contacts', 'pipeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'relative pb-1 text-[13px] font-medium transition-colors',
                activeTab === tab ? 'text-gold' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <div className="flex items-center space-x-2">
                {tab === 'contacts' ? <UsersIcon size={14} /> : <LayoutGrid size={14} />}
                <span className="capitalize">{tab}</span>
              </div>
              {activeTab === tab && (
                <div className="absolute -bottom-[13px] left-0 right-0 h-0.5 bg-gold" />
              )}
            </button>
          ))}
        </div>

        <Button onClick={openAdd} size="sm" className="space-x-2">
          <Plus size={14} />
          <span>Add Contact</span>
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="px-6 py-3 space-y-3 flex-shrink-0 border-b border-gold/5">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
          <input
            type="text"
            placeholder="Search contacts, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-gold/10 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-0.5 scrollbar-none">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                'flex-shrink-0 px-3 py-1 text-[11px] font-medium rounded-full border transition-all',
                statusFilter === f
                  ? 'bg-gold/15 text-gold border-gold/30'
                  : 'bg-white/5 border-gold/5 text-text-secondary hover:text-gold hover:border-gold/30'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'contacts' ? (
          <ContactsTable searchQuery={searchQuery} statusFilter={statusFilter} />
        ) : (
          <LeadPipeline />
        )}

        <ContactDetail
          isOpen={!!activeContactId}
          onClose={() => setActiveContactId(null)}
          contactId={activeContactId}
          onEdit={openEdit}
        />
      </div>

      {showAddModal && (
        <AddContactForm
          contact={editContact}
          onClose={() => { setShowAddModal(false); setEditContact(null); }}
        />
      )}
    </div>
  );
};

const SearchIcon = ({ className, size }: { className?: string; size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);
