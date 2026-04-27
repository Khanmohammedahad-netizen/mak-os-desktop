"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Columns, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { DealsPipeline } from './DealsPipeline';
import { DealsTable } from './DealsTable';
import { AddDealForm } from './AddDealForm';
import { DealDetail } from './DealDetail';
import { useDealsStore } from '@/stores/dealsStore';
import { Deal } from '@/types';

const MOCK_DEALS: Deal[] = [
  {
    id: 'mock-1',
    contact_id: null,
    title: 'Acme Corp — Website Redesign',
    value: 18500,
    currency: 'USD',
    stage: 'Proposal',
    probability: 65,
    expected_close_date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
    notes: 'Awaiting client feedback on proposal V2.',
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'mock-2',
    contact_id: null,
    title: 'FinTech Startup — SaaS Platform',
    value: 85000,
    currency: 'USD',
    stage: 'Negotiation',
    probability: 80,
    expected_close_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    notes: 'Contract review underway.',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'mock-3',
    contact_id: null,
    title: 'Retail Chain — POS Integration',
    value: 42000,
    currency: 'USD',
    stage: 'Qualified',
    probability: 45,
    expected_close_date: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
    notes: 'Discovery call completed.',
    created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'mock-4',
    contact_id: null,
    title: 'Healthcare — Analytics Dashboard',
    value: 120000,
    currency: 'USD',
    stage: 'Closed Won',
    probability: 100,
    expected_close_date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
    notes: 'Contract signed. Kickoff scheduled.',
    created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'mock-5',
    contact_id: null,
    title: 'Media Agency — Content Platform',
    value: 28000,
    currency: 'GBP',
    stage: 'Lead',
    probability: 20,
    expected_close_date: new Date(Date.now() + 86400000 * 45).toISOString().split('T')[0],
    notes: 'Initial outreach made.',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'mock-6',
    contact_id: null,
    title: 'Logistics Co — Mobile App',
    value: 55000,
    currency: 'USD',
    stage: 'Proposal',
    probability: 55,
    expected_close_date: new Date(Date.now() + 86400000 * 21).toISOString().split('T')[0],
    notes: 'Proposal sent, follow-up next week.',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'mock-7',
    contact_id: null,
    title: 'EdTech — LMS Migration',
    value: 34000,
    currency: 'USD',
    stage: 'Closed Lost',
    probability: 0,
    expected_close_date: new Date(Date.now() - 86400000 * 10).toISOString().split('T')[0],
    notes: 'Lost to competitor on price.',
    created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'mock-8',
    contact_id: null,
    title: 'Real Estate — CRM Setup',
    value: 12500,
    currency: 'AED',
    stage: 'Qualified',
    probability: 40,
    expected_close_date: new Date(Date.now() + 86400000 * 25).toISOString().split('T')[0],
    notes: 'Demo scheduled for next week.',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const DealsApp = () => {
  const { deals, setDeals, setLoading, activeDealId, setActiveDealId } = useDealsStore();
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  useEffect(() => {
    const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
    if (useMock) {
      setDeals(MOCK_DEALS);
      return;
    }
    const fetchDeals = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/deals');
        const data = await res.json();
        if (Array.isArray(data)) setDeals(data);
      } catch (err) {
        console.error('Failed to fetch deals:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, [setDeals, setLoading]);

  // Summary metrics
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeDeals = deals.filter((d) => d.stage !== 'Closed Lost');
  const totalPipeline = activeDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const weighted = activeDeals.reduce((s, d) => s + (d.value ?? 0) * (d.probability / 100), 0);
  const wonThisMonth = deals
    .filter((d) => d.stage === 'Closed Won' && new Date(d.updated_at) >= monthStart)
    .reduce((s, d) => s + (d.value ?? 0), 0);
  const wonCount = deals.filter((d) => d.stage === 'Closed Won').length;
  const lostCount = deals.filter((d) => d.stage === 'Closed Lost').length;
  const conversion = wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-bg-surface/50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10 bg-white/5 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <h2
            className="font-display font-semibold text-gold"
            style={{ fontSize: '22px', fontFamily: 'var(--font-display, "Cormorant Garamond", serif)' }}
          >
            Deals Pipeline
          </h2>
          <div className="h-4 w-[1px] bg-gold/20" />
          <span className="text-sm font-medium text-gold/70">${totalPipeline.toLocaleString()}</span>
          <div className="flex bg-black/20 p-1 rounded-lg border border-gold/10">
            <button
              onClick={() => setView('pipeline')}
              title="Pipeline view"
              className={cn(
                'p-1.5 rounded-md transition-all',
                view === 'pipeline' ? 'bg-gold text-bg-primary' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Columns size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              title="List view"
              className={cn(
                'p-1.5 rounded-md transition-all',
                view === 'list' ? 'bg-gold text-bg-primary' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        <Button onClick={() => setShowAddModal(true)} size="sm" className="space-x-2">
          <Plus size={14} />
          <span>New Deal</span>
        </Button>
      </div>

      {/* Summary Row */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-gold/5 bg-black/10 flex-shrink-0">
        <Metric label="Total Pipeline" value={`$${totalPipeline.toLocaleString()}`} />
        <Divider />
        <Metric label="Weighted" value={`$${Math.round(weighted).toLocaleString()}`} />
        <Divider />
        <Metric label="Won This Month" value={`$${wonThisMonth.toLocaleString()}`} color="text-green-400" />
        <Divider />
        <Metric
          label="Conversion"
          value={`${conversion.toFixed(1)}%`}
          color={conversion >= 50 ? 'text-green-400' : 'text-yellow-400'}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {view === 'pipeline' ? (
          <DealsPipeline />
        ) : (
          <div className="p-6 overflow-auto h-full">
            <DealsTable />
          </div>
        )}

        <DealDetail
          isOpen={!!activeDealId}
          onClose={() => setActiveDealId(null)}
          dealId={activeDealId}
          onEdit={(d) => {
            setEditingDeal(d);
            setActiveDealId(null);
          }}
        />
      </div>

      {(showAddModal || editingDeal) && (
        <AddDealForm
          deal={editingDeal ?? undefined}
          onClose={() => { setShowAddModal(false); setEditingDeal(null); }}
        />
      )}
    </div>
  );
};

const Metric = ({
  label,
  value,
  color = 'text-text-primary',
}: {
  label: string;
  value: string;
  color?: string;
}) => (
  <div className="flex flex-col">
    <span className="text-[10px] uppercase tracking-wider text-text-secondary font-medium">{label}</span>
    <span className={cn('text-sm font-semibold', color)}>{value}</span>
  </div>
);

const Divider = () => <div className="w-[1px] h-8 bg-gold/10 flex-shrink-0" />;
