"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { useCRMStore } from '@/stores/crmStore';
import { useToastStore } from '@/stores/toastStore';
import { Contact } from '@/types';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
  status: z.string(),
  source: z.string(),
  category: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  deal_value: z.number(),
  tags: z.string().optional(),
  notes: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface AddContactFormProps {
  contact: Contact | null;
  onClose: () => void;
}

export const AddContactForm = ({ contact, onClose }: AddContactFormProps) => {
  const isEdit = !!contact;
  const { addContact, updateContact } = useCRMStore();
  const { toast } = useToastStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema) as any,
    defaultValues: contact
      ? {
          name: contact.name,
          email: contact.email ?? '',
          phone: contact.phone ?? '',
          company: contact.company ?? '',
          website: contact.website ?? '',
          status: contact.status,
          source: contact.source,
          category: contact.category ?? '',
          country: contact.country ?? '',
          city: contact.city ?? '',
          deal_value: contact.deal_value ?? 0,
          tags: contact.tags?.join(', ') ?? '',
          notes: contact.notes ?? '',
        }
      : {
          name: '', email: '', phone: '', company: '', website: '',
          status: 'New', source: 'Manual', category: '', country: '', city: '',
          deal_value: 0, tags: '', notes: '',
        },
  });

  const onSubmit = async (values: ContactFormValues) => {
    const tagsArray = values.tags
      ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const payload = { ...values, tags: tagsArray };

    try {
      if (isEdit && contact) {
        const res = await fetch(`/api/contacts/${contact.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update contact');
        const updated = await res.json();
        updateContact(contact.id, updated);
        toast('Contact updated');
      } else {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create contact');
        const created = await res.json();
        addContact(created);
        toast('Contact added');
      }
      onClose();
    } catch (err) {
      console.error('Submit error:', err);
      toast('Something went wrong', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl glass rounded-2xl shadow-2xl overflow-hidden border border-gold/20 max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-gold/10 flex-shrink-0">
          <h2 className="text-xl font-display font-semibold text-gold">
            {isEdit ? 'Edit Contact' : 'Add New Contact'}
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form id="contact-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                {...register('name')}
                error={errors.name?.message}
                placeholder="John Doe"
              />
              <Input label="Company" {...register('company')} placeholder="Acme Inc." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Email Address"
                {...register('email')}
                error={errors.email?.message}
                placeholder="john@example.com"
              />
              <Input label="Phone Number" {...register('phone')} placeholder="+1 (555) 000-0000" />
            </div>

            <Input label="Website" {...register('website')} placeholder="https://example.com" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary ml-1">Status</label>
                <select
                  {...register('status')}
                  className="w-full bg-[#1A1A1D] border border-gold/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50"
                >
                  {['New', 'Contacted', 'Meeting Set', 'Demo Given', 'Proposal Sent', 'Won', 'Lost'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary ml-1">Source</label>
                <select
                  {...register('source')}
                  className="w-full bg-[#1A1A1D] border border-gold/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50"
                >
                  {['Manual', 'Website', 'Referral', 'LinkedIn', 'Cold Outreach', 'Event', 'Other'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary ml-1">Category</label>
                <select
                  {...register('category')}
                  className="w-full bg-[#1A1A1D] border border-gold/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50"
                >
                  <option value="">— None —</option>
                  {['Lead', 'Client', 'Partner', 'Vendor', 'Investor', 'Other'].map((c) => (
                    <option key={c} value={c.toLowerCase()}>{c}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Deal Value ($)"
                type="number"
                {...register('deal_value', { valueAsNumber: true })}
                placeholder="5000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Country" {...register('country')} placeholder="United States" />
              <Input label="City" {...register('city')} placeholder="New York" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary ml-1">Tags</label>
              <Input
                {...register('tags')}
                placeholder="vip, enterprise, warm (comma-separated)"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary ml-1">Notes</label>
              <textarea
                {...register('notes')}
                className="w-full h-24 bg-white/5 border border-gold/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50 transition-all resize-none"
                placeholder="Initial outreach notes..."
              />
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gold/10 flex-shrink-0">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button form="contact-form" type="submit" disabled={isSubmitting} className="min-w-[140px]">
            {isSubmitting ? 'Saving…' : isEdit ? 'Update Contact' : 'Add Contact'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
