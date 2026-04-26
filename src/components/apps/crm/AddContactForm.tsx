"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { useCRMStore } from '@/stores/crmStore';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
  status: z.string(),
  source: z.string(),
  deal_value: z.number(),
  notes: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface AddContactFormProps {
  onClose: () => void;
  editContact?: Partial<ContactFormValues>;
}

export const AddContactForm = ({ onClose, editContact }: AddContactFormProps) => {
  const { setContacts, contacts } = useCRMStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema) as any,
    defaultValues: editContact || {
      name: '',
      email: '',
      phone: '',
      company: '',
      website: '',
      status: 'New',
      source: 'Manual',
      deal_value: 0,
      notes: '',
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Failed to save contact');

      const newContact = await response.json();
      setContacts([newContact, ...contacts]);
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
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
        className="relative w-full max-w-xl glass rounded-2xl shadow-2xl overflow-hidden border border-gold/20"
      >
        <div className="flex items-center justify-between p-6 border-b border-gold/10">
          <h2 className="text-xl font-display font-semibold text-gold">Add New Contact</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Full Name *" 
              {...register('name')} 
              error={errors.name?.message as string | undefined} 
              placeholder="John Doe"
            />
            <Input 
              label="Company" 
              {...register('company')} 
              placeholder="Acme Inc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Email Address" 
              {...register('email')} 
              error={errors.email?.message as string | undefined}
              placeholder="john@example.com"
            />
            <Input 
              label="Phone Number" 
              {...register('phone')} 
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary ml-1">Status</label>
              <select 
                {...register('status')}
                className="w-full bg-[#1A1A1D] border border-gold/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Meeting Set">Meeting Set</option>
                <option value="Demo Given">Demo Given</option>
                <option value="Proposal Sent">Proposal Sent</option>
              </select>
            </div>
            <Input
              label="Deal Value ($)"
              type="number"
              {...register('deal_value', { valueAsNumber: true })}
              placeholder="5000"
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

          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? 'Saving...' : 'Save Contact'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
