"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCRMStore } from '@/stores/crmStore';
import { Contact } from '@/types';

const PAGE_SIZE = 20;

interface ContactsTableProps {
  searchQuery: string;
  statusFilter?: string;
}

type SortField = keyof Pick<Contact, 'name' | 'company' | 'status' | 'source' | 'deal_value' | 'last_contacted_at' | 'next_follow_up_at'>;

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  contacted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'meeting set': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'demo given': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'proposal sent': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  won: 'bg-green-500/20 text-green-400 border-green-500/30',
  lost: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const getStatusColor = (status: string) =>
  STATUS_COLORS[status.toLowerCase()] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30';

export const ContactsTable = ({ searchQuery, statusFilter = 'All' }: ContactsTableProps) => {
  const { contacts, setContacts, setLoading, loading, setActiveContactId } = useCRMStore();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [searchQuery, statusFilter]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: searchQuery });
      if (statusFilter !== 'All') params.set('status', statusFilter);
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) setContacts(data);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, setContacts, setLoading]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sorted = [...contacts].sort((a, b) => {
    const av = a[sortField] ?? '';
    const bv = b[sortField] ?? '';
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageContacts = sorted.slice(start, start + PAGE_SIZE);

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={11} className="opacity-25 ml-0.5 inline" />;
    return sortOrder === 'asc'
      ? <ChevronUp size={11} className="text-gold ml-0.5 inline" />
      : <ChevronDown size={11} className="text-gold ml-0.5 inline" />;
  };

  const ColHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <th
      className={cn('py-3 px-2 cursor-pointer select-none hover:text-gold/80 transition-colors whitespace-nowrap', className)}
      onClick={() => handleSort(field)}
    >
      {label}<SortArrow field={field} />
    </th>
  );

  if (loading && contacts.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-auto px-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gold/5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
                {['Name', 'Company', 'Status', 'Source', 'Deal Value', 'Last Contact', 'Next Follow-Up'].map((h) => (
                  <th key={h} className="py-3 px-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gold/5">
                  <td className="py-4 px-2">
                    <div className="space-y-1.5">
                      <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
                      <div className="h-2.5 w-40 bg-white/5 rounded animate-pulse" />
                    </div>
                  </td>
                  {[28, 20, 16, 16, 20, 24].map((w, j) => (
                    <td key={j} className="py-4 px-2">
                      <div className="h-3 bg-white/10 rounded animate-pulse" style={{ width: `${w * 3}px` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-6">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-bg-surface/95 backdrop-blur z-10">
            <tr className="border-b border-gold/5 text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
              <ColHeader field="name" label="Name" />
              <ColHeader field="company" label="Company" />
              <ColHeader field="status" label="Status" />
              <ColHeader field="source" label="Source" />
              <ColHeader field="deal_value" label="Deal Value" />
              <ColHeader field="last_contacted_at" label="Last Contact" />
              <ColHeader field="next_follow_up_at" label="Next Follow-Up" />
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {pageContacts.map((contact) => (
              <tr
                key={contact.id}
                onClick={() => setActiveContactId(contact.id)}
                className="border-b border-gold/5 hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <td className="py-4 px-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-text-primary group-hover:text-gold transition-colors">
                      {contact.name}
                    </span>
                    <span className="text-[11px] text-text-secondary">{contact.email}</span>
                  </div>
                </td>
                <td className="py-4 px-2 text-text-secondary">{contact.company || '—'}</td>
                <td className="py-4 px-2">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', getStatusColor(contact.status))}>
                    {contact.status}
                  </span>
                </td>
                <td className="py-4 px-2 text-text-secondary capitalize">{contact.source || '—'}</td>
                <td className="py-4 px-2 text-gold font-medium">
                  {contact.deal_value ? `$${Number(contact.deal_value).toLocaleString()}` : '—'}
                </td>
                <td className="py-4 px-2 text-text-secondary">
                  {contact.last_contacted_at
                    ? new Date(contact.last_contacted_at).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="py-4 px-2">
                  {contact.next_follow_up_at ? (
                    <span className={cn(
                      'text-[11px] font-medium',
                      new Date(contact.next_follow_up_at) < new Date() ? 'text-red-400' : 'text-text-secondary'
                    )}>
                      {new Date(contact.next_follow_up_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
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
            <h3 className="text-text-primary font-medium">No contacts yet</h3>
            <p className="text-text-secondary text-sm max-w-xs mx-auto mt-1">
              Try adjusting your search or add a new contact to get started.
            </p>
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-gold/5 text-[12px] text-text-secondary">
          <span>
            Showing {Math.min(start + 1, totalCount)}–{Math.min(start + PAGE_SIZE, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center space-x-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded border border-gold/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <span className="px-2 tabular-nums">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border border-gold/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const UsersIcon = ({ className, size }: { className?: string; size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
