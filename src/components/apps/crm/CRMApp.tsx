"use client";

import React, { useState } from 'react';
import { Search, Plus, Filter, Users as UsersIcon, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { ContactsTable } from './ContactsTable';
import { LeadPipeline } from './LeadPipeline';
import { AddContactForm } from './AddContactForm';
import { ContactDetail } from './ContactDetail';
import { useCRMStore } from '@/stores/crmStore';

export const CRMApp = () => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'pipeline'>('contacts');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { activeContactId, setActiveContactId } = useCRMStore();

  return (
    <div className="flex flex-col h-full bg-bg-surface/50">
      {/* Tab Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gold/10 bg-white/5">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => setActiveTab('contacts')}
            className={cn(
              "relative pb-1 text-[13px] font-medium transition-colors",
              activeTab === 'contacts' ? "text-gold" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <div className="flex items-center space-x-2">
              <UsersIcon size={14} />
              <span>Contacts</span>
            </div>
            {activeTab === 'contacts' && (
              <div className="absolute -bottom-[13px] left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={cn(
              "relative pb-1 text-[13px] font-medium transition-colors",
              activeTab === 'pipeline' ? "text-gold" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <div className="flex items-center space-x-2">
              <LayoutGrid size={14} />
              <span>Pipeline</span>
            </div>
            {activeTab === 'pipeline' && (
              <div className="absolute -bottom-[13px] left-0 right-0 h-0.5 bg-gold" />
            )}
          </button>
        </div>

        <Button 
          onClick={() => setShowAddModal(true)}
          size="sm" 
          className="h-8 space-x-2"
        >
          <Plus size={14} />
          <span>Add Contact</span>
        </Button>
      </div>

      {/* Filters Area */}
      <div className="px-6 py-4 flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
          <input
            type="text"
            placeholder="Search contacts, companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-gold/10 rounded-lg pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gold/30 transition-all"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          {['All', 'New', 'Contacted', 'Proposal'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "px-3 py-1 text-[11px] font-medium rounded-full border transition-all",
                statusFilter === filter
                  ? "bg-gold/15 text-gold border-gold/30"
                  : "bg-white/5 border-gold/5 text-text-secondary hover:text-gold hover:border-gold/30"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'contacts' ? (
          <ContactsTable searchQuery={searchQuery} statusFilter={statusFilter} />
        ) : (
          <LeadPipeline />
        )}

        {/* Slide-over Detail Panel */}
        <ContactDetail 
          isOpen={!!activeContactId} 
          onClose={() => setActiveContactId(null)} 
          contactId={activeContactId}
        />
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddContactForm onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};
