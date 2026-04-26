"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Filter, Download, LayoutDashboard, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/Button';
import { DealsDashboard } from './DealsDashboard';
import { DealsTable } from './DealsTable';
import { AddDealForm } from './AddDealForm';
import { useDealsStore } from '@/stores/dealsStore';

export const DealsApp = () => {
  const { setDeals, setLoading } = useDealsStore();
  const [view, setView] = useState<'dashboard' | 'list'>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/deals');
        const data = await response.json();
        if (Array.isArray(data)) {
          setDeals(data);
        }
      } catch (error) {
        console.error('Failed to fetch deals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, [setDeals, setLoading]);

  return (
    <div className="flex flex-col h-full bg-bg-surface/50">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gold/10 bg-white/5">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-display font-semibold text-gold">Sales Pipeline</h2>
          <div className="h-4 w-[1px] bg-gold/20" />
          <div className="flex bg-black/20 p-1 rounded-lg border border-gold/10">
            <button
              onClick={() => setView('dashboard')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                view === 'dashboard' ? "bg-gold text-bg-primary" : "text-text-secondary hover:text-text-primary"
              )}
            >
              <LayoutDashboard size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                "p-1.5 rounded-md transition-all",
                view === 'list' ? "bg-gold text-bg-primary" : "text-text-secondary hover:text-text-primary"
              )}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" className="space-x-2">
            <Download size={14} />
            <span>Export</span>
          </Button>
          <Button onClick={() => setShowAddModal(true)} size="sm" className="space-x-2">
            <Plus size={14} />
            <span>New Deal</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-8">
          <DealsDashboard />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Active Opportunities</h3>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="text-[11px] h-7 space-x-1 border border-gold/10">
                  <Filter size={12} />
                  <span>Filters</span>
                </Button>
              </div>
            </div>
            <DealsTable />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddDealForm onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
};
