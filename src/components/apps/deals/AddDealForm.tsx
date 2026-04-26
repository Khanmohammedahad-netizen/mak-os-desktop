"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { useDealsStore } from '@/stores/dealsStore';

const dealSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  value: z.number().min(0),
  currency: z.string(),
  stage: z.string(),
  probability: z.number().min(0).max(100),
  expected_close_date: z.string().optional(),
  notes: z.string().optional(),
});

type DealFormValues = z.infer<typeof dealSchema>;

interface AddDealFormProps {
  onClose: () => void;
}

export const AddDealForm = ({ onClose }: AddDealFormProps) => {
  const { addDeal } = useDealsStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema) as any,
    defaultValues: {
      title: '',
      value: 0,
      currency: 'USD',
      stage: 'Lead',
      probability: 10,
      expected_close_date: '',
      notes: '',
    },
  });

  const onSubmit = async (values: DealFormValues) => {
    try {
      const response = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error('Failed to save deal');

      const newDeal = await response.json();
      addDeal(newDeal);
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
          <h2 className="text-xl font-display font-semibold text-gold">New Deal</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <Input
            label="Deal Title *"
            {...register('title')}
            error={errors.title?.message}
            placeholder="e.g. Acme Corp — Website Redesign"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Value ($)"
              type="number"
              {...register('value', { valueAsNumber: true })}
              error={errors.value?.message}
              placeholder="5000"
            />
            <Input
              label="Probability (%)"
              type="number"
              min={0}
              max={100}
              {...register('probability', { valueAsNumber: true })}
              error={errors.probability?.message}
              placeholder="50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary ml-1">Stage</label>
              <select
                {...register('stage')}
                className="w-full bg-[#1A1A1D] border border-gold/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50"
              >
                {['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <Input
              label="Expected Close Date"
              type="date"
              {...register('expected_close_date')}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary ml-1">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full bg-white/5 border border-gold/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-gold/50 transition-all resize-none"
              placeholder="Deal notes..."
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? 'Saving...' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
