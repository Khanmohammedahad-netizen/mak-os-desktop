"use client";

import React, { useEffect, useState } from 'react';
import { MoreHorizontal, ChevronRight, Globe, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCRMStore } from '@/stores/crmStore';
import { Contact } from '@/types';

interface ContactsTableProps {
  searchQuery: string;
}

export const ContactsTable = ({ searchQuery }: ContactsTableProps) => {
  const { contacts, setContacts, setLoading, loading, setActiveContactId } = useCRMStore();
  const [sortField, setSortField] = useState<keyof Contact>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/contacts?search=${searchQuery}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setContacts(data);
        }
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [searchQuery, setContacts, setLoading]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'contacted': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'meeting set': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'won': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'lost': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading && contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">Loading contacts...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto px-6 pb-20">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gold/5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
            <th className="py-3 px-2">Name</th>
            <th className="py-3 px-2">Company</th>
            <th className="py-3 px-2">Status</th>
            <th className="py-3 px-2">Deal Value</th>
            <th className="py-3 px-2">Last Contact</th>
            <th className="py-3 px-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="text-[13px]">
          {contacts.map((contact) => (
            <tr 
              key={contact.id}
              onClick={() => setActiveContactId(contact.id)}
              className="border-b border-gold/5 hover:bg-white/5 transition-colors cursor-pointer group"
            >
              <td className="py-4 px-2">
                <div className="flex flex-col">
                  <span className="font-medium text-text-primary group-hover:text-gold transition-colors">{contact.name}</span>
                  <span className="text-[11px] text-text-secondary">{contact.email}</span>
                </div>
              </td>
              <td className="py-4 px-2 text-text-secondary">
                {contact.company || '—'}
              </td>
              <td className="py-4 px-2">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                  getStatusColor(contact.status)
                )}>
                  {contact.status}
                </span>
              </td>
              <td className="py-4 px-2 text-gold font-medium">
                {contact.deal_value ? `$${Number(contact.deal_value).toLocaleString()}` : '—'}
              </td>
              <td className="py-4 px-2 text-text-secondary">
                {contact.last_contacted_at ? new Date(contact.last_contacted_at).toLocaleDateString() : 'Never'}
              </td>
              <td className="py-4 px-2 text-right">
                <button className="p-1 hover:bg-white/10 rounded transition-colors text-text-secondary">
                  <MoreHorizontal size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {contacts.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gold/5 rounded-full flex items-center justify-center mb-4">
            <UsersIcon className="text-gold/20" size={32} />
          </div>
          <h3 className="text-text-primary font-medium">No contacts found</h3>
          <p className="text-text-secondary text-sm max-w-xs mx-auto mt-1">
            Try adjusting your search or add a new contact to get started.
          </p>
        </div>
      )}
    </div>
  );
};

const UsersIcon = ({ className, size }: { className?: string; size?: number }) => (
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
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
