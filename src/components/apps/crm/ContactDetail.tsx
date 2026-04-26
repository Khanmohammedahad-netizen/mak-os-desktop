"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Mail, Phone, Globe, MapPin, 
  Calendar, Tag, Edit2, Trash2, 
  Clock, CheckCircle2, MessageSquare 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { Contact, ActivityLog } from '@/types';

interface ContactDetailProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string | null;
}

export const ContactDetail = ({ isOpen, onClose, contactId }: ContactDetailProps) => {
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contactId && isOpen) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [contactRes, activityRes] = await Promise.all([
            fetch(`/api/contacts/${contactId}`),
            fetch(`/api/activity?entity_type=contact&entity_id=${contactId}`)
          ]);
          
          const contactData = await contactRes.json();
          const activityData = await activityRes.json();
          
          setContact(contactData);
          setActivities(activityData);
        } catch (error) {
          console.error('Failed to fetch contact details:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [contactId, isOpen]);

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
              <div className="p-6 border-b border-gold/10">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20 text-gold text-2xl font-display font-bold">
                    {contact.name.charAt(0)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-os-red hover:bg-os-red/10">
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
              <div className="flex-1 overflow-auto p-6 space-y-8">
                {/* Contact Info Grid */}
                <div className="grid grid-cols-1 gap-4">
                  <InfoItem icon={Mail} label="Email" value={contact.email} isLink />
                  <InfoItem icon={Phone} label="Phone" value={contact.phone} />
                  <InfoItem icon={Globe} label="Website" value={contact.website} isLink />
                  <InfoItem icon={MapPin} label="Location" value={contact.city ? `${contact.city}, ${contact.country}` : contact.country} />
                </div>

                {/* Status & Value */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-gold/10">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">Status</p>
                    <span className="text-gold font-medium">{contact.status}</span>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold">Deal Value</p>
                    <span className="text-gold font-medium">
                      {contact.deal_value ? `$${Number(contact.deal_value).toLocaleString()}` : '$0'}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[11px] uppercase tracking-wider text-text-secondary font-bold flex items-center space-x-2">
                      <Tag size={12} />
                      <span>Tags</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-md border border-gold/20 text-[10px] text-gold-light bg-gold/5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-3">
                  <h3 className="text-[11px] uppercase tracking-wider text-text-secondary font-bold flex items-center space-x-2">
                    <MessageSquare size={12} />
                    <span>Notes</span>
                  </h3>
                  <div className="p-4 bg-white/5 rounded-xl border border-gold/5 text-sm text-text-secondary leading-relaxed">
                    {contact.notes || 'No notes available for this contact.'}
                  </div>
                </div>

                {/* Activity Feed */}
                <div className="space-y-4">
                  <h3 className="text-[11px] uppercase tracking-wider text-text-secondary font-bold flex items-center space-x-2">
                    <Clock size={12} />
                    <span>Recent Activity</span>
                  </h3>
                  <div className="space-y-4">
                    {activities.length > 0 ? activities.map((activity) => (
                      <div key={activity.id} className="flex space-x-3">
                        <div className="mt-1">
                          <div className="w-2 h-2 rounded-full bg-gold/40 shadow-[0_0_5px_rgba(201,168,76,0.5)]" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-[12px] text-text-primary">
                            <span className="capitalize font-medium">{activity.action}</span> contact
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

              {/* Footer Actions */}
              <div className="p-6 border-t border-gold/10 flex items-center space-x-3">
                <Button className="flex-1">Log Interaction</Button>
                <Button variant="secondary" className="flex-1">Add Task</Button>
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
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-secondary group-hover:text-gold transition-colors">
        <Icon size={14} />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">{label}</span>
        {isLink ? (
          <a href="#" className="text-[13px] text-text-primary hover:text-gold transition-colors truncate max-w-[280px]">
            {value}
          </a>
        ) : (
          <span className="text-[13px] text-text-primary truncate max-w-[280px]">{value}</span>
        )}
      </div>
    </div>
  );
};
