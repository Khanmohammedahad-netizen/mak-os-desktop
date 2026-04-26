"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Phone, Globe, MapPin,
  Tag, Edit2, Trash2, Clock, MessageSquare, Save, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { Contact, ActivityLog } from '@/types';
import { useCRMStore } from '@/stores/crmStore';
import { useToastStore } from '@/stores/toastStore';

const STATUSES = ['New', 'Contacted', 'Meeting Set', 'Demo Given', 'Proposal Sent', 'Won', 'Lost'];

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  contacted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'meeting set': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'demo given': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'proposal sent': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  won: 'bg-green-500/20 text-green-400 border-green-500/30',
  lost: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface ContactDetailProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string | null;
  onEdit: (contact: Contact) => void;
}

export const ContactDetail = ({ isOpen, onClose, contactId, onEdit }: ContactDetailProps) => {
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusDropOpen, setStatusDropOpen] = useState(false);
  const { updateContact, updateContactStatus, removeContact } = useCRMStore();
  const { toast } = useToastStore();
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contactId && isOpen) {
      const fetchData = async () => {
        setLoading(true);
        setEditingNotes(false);
        setStatusDropOpen(false);
        try {
          const [contactRes, activityRes] = await Promise.all([
            fetch(`/api/contacts/${contactId}`),
            fetch(`/api/activity?entity_type=contact&entity_id=${contactId}`),
          ]);
          const contactData = await contactRes.json();
          const activityData = await activityRes.json();
          setContact(contactData);
          setNotesValue(contactData.notes ?? '');
          setActivities(Array.isArray(activityData) ? activityData : []);
        } catch (err) {
          console.error('Failed to fetch contact details:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [contactId, isOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setStatusDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleStatusChange = async (status: string) => {
    if (!contact) return;
    setStatusDropOpen(false);
    setChangingStatus(true);
    try {
      await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      updateContactStatus(contact.id, status);
      setContact((c) => (c ? { ...c, status } : c));
      toast(`Status updated to ${status}`);
    } catch {
      toast('Failed to update status', 'error');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!contact) return;
    setSavingNotes(true);
    try {
      await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesValue }),
      });
      updateContact(contact.id, { notes: notesValue });
      setContact((c) => (c ? { ...c, notes: notesValue } : c));
      setEditingNotes(false);
      toast('Notes saved');
    } catch {
      toast('Failed to save notes', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    if (!contact) return;
    if (!confirm(`Delete ${contact.name}? This cannot be undone.`)) return;
    try {
      await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
      removeContact(contact.id);
      toast(`${contact.name} deleted`);
      onClose();
    } catch {
      toast('Failed to delete contact', 'error');
    }
  };

  const statusColor = contact
    ? (STATUS_COLORS[contact.status.toLowerCase()] ?? 'bg-gold/10 text-gold border-gold/20')
    : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute top-0 right-0 w-[420px] h-full bg-bg-surface glass border-l border-gold/20 z-[50] flex flex-col shadow-2xl"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : contact ? (
            <>
              {/* Header */}
              <div className="p-6 border-b border-gold/10 flex-shrink-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20 text-gold text-2xl font-display font-bold">
                    {contact.name.charAt(0)}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(contact)}>
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/10" onClick={handleDelete}>
                      <Trash2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                      <X size={18} />
                    </Button>
                  </div>
                </div>
                <h2 className="text-2xl font-display font-semibold text-text-primary tracking-tight">
                  {contact.name}
                </h2>
                <p className="text-text-secondary text-sm">{contact.company || 'Private Individual'}</p>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-auto p-6 space-y-6">
                {/* Contact Info Grid */}
                <div className="grid grid-cols-1 gap-3">
                  <InfoItem icon={Mail} label="Email" value={contact.email ?? undefined} isLink />
                  <InfoItem icon={Phone} label="Phone" value={contact.phone ?? undefined} />
                  <InfoItem icon={Globe} label="Website" value={contact.website ?? undefined} isLink />
                  <InfoItem
                    icon={MapPin}
                    label="Location"
                    value={contact.city
                      ? `${contact.city}${contact.country ? `, ${contact.country}` : ''}`
                      : (contact.country ?? undefined)}
                  />
                  <InfoItem icon={Tag} label="Source" value={contact.source} />
                  {contact.category && (
                    <InfoItem icon={Tag} label="Category" value={contact.category} />
                  )}
                </div>

                {/* Status + Deal Value */}
                <div className="flex items-start justify-between p-4 bg-white/5 rounded-xl border border-gold/10 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">Status</p>
                    <div className="relative" ref={dropRef}>
                      <button
                        onClick={() => setStatusDropOpen((o) => !o)}
                        disabled={changingStatus}
                        className={cn(
                          'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all',
                          statusColor
                        )}
                      >
                        <span>{contact.status}</span>
                        <ChevronDown size={10} />
                      </button>
                      {statusDropOpen && (
                        <div className="absolute top-full left-0 mt-1 w-44 glass border border-gold/20 rounded-xl shadow-2xl z-20 overflow-hidden">
                          {STATUSES.map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(s)}
                              className={cn(
                                'w-full text-left px-4 py-2 text-[12px] hover:bg-white/10 transition-colors',
                                contact.status === s ? 'text-gold font-semibold' : 'text-text-primary'
                              )}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">Deal Value</p>
                    <span className="text-gold font-medium text-sm">
                      {contact.deal_value ? `$${Number(contact.deal_value).toLocaleString()}` : '$0'}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[11px] uppercase tracking-wider text-text-secondary font-bold">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-md border border-gold/20 text-[10px] text-gold bg-gold/5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] uppercase tracking-wider text-text-secondary font-bold flex items-center space-x-2">
                      <MessageSquare size={12} />
                      <span>Notes</span>
                    </h3>
                    {!editingNotes ? (
                      <button
                        onClick={() => setEditingNotes(true)}
                        className="text-[11px] text-gold/60 hover:text-gold transition-colors"
                      >
                        Edit
                      </button>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => { setEditingNotes(false); setNotesValue(contact.notes ?? ''); }}
                          className="text-[11px] text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveNotes}
                          disabled={savingNotes}
                          className="flex items-center space-x-1 text-[11px] text-gold hover:text-gold/80 transition-colors"
                        >
                          <Save size={11} />
                          <span>{savingNotes ? 'Saving…' : 'Save'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {editingNotes ? (
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      className="w-full h-28 bg-white/5 border border-gold/20 rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/40 resize-none transition-all"
                      autoFocus
                    />
                  ) : (
                    <div className="p-4 bg-white/5 rounded-xl border border-gold/5 text-sm text-text-secondary leading-relaxed min-h-[72px]">
                      {contact.notes || 'No notes. Click Edit to add some.'}
                    </div>
                  )}
                </div>

                {/* Activity Feed */}
                <div className="space-y-3">
                  <h3 className="text-[11px] uppercase tracking-wider text-text-secondary font-bold flex items-center space-x-2">
                    <Clock size={12} />
                    <span>Recent Activity</span>
                  </h3>
                  <div className="space-y-3">
                    {activities.length > 0 ? activities.slice(0, 8).map((activity) => (
                      <div key={activity.id} className="flex space-x-3">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-gold/40 shadow-[0_0_5px_rgba(201,168,76,0.5)] flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-[12px] text-text-primary capitalize">
                            <span className="font-medium">{activity.action}</span> contact
                          </p>
                          <p className="text-[10px] text-text-secondary">
                            {new Date(activity.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-[11px] text-text-secondary italic">No recent activity.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  isLink?: boolean;
}

const InfoItem = ({ icon: Icon, label, value, isLink }: InfoItemProps) => {
  if (!value) return null;
  return (
    <div className="flex items-center space-x-3 group">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-secondary group-hover:text-gold transition-colors flex-shrink-0">
        <Icon size={14} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">{label}</span>
        {isLink ? (
          <a href="#" className="text-[13px] text-text-primary hover:text-gold transition-colors truncate">
            {value}
          </a>
        ) : (
          <span className="text-[13px] text-text-primary truncate capitalize">{value}</span>
        )}
      </div>
    </div>
  );
};
