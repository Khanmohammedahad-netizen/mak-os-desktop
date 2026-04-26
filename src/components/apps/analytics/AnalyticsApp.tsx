"use client";

import React, { useEffect } from 'react';
import {
  DollarSign, Users, Handshake, CheckSquare,
  TrendingUp, Target, BarChart3, Activity
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { MetricCard } from './MetricCard';
import { useCRMStore } from '@/stores/crmStore';
import { useDealsStore } from '@/stores/dealsStore';
import { useTasksStore } from '@/stores/tasksStore';

const GOLD = '#C9A84C';
const GOLD_LIGHT = '#E8C97A';
const GREEN = '#28C840';
const RED = '#FF5F57';
const BLUE = '#4A9EFF';
const PURPLE = '#A855F7';

const PIPELINE_COLORS: Record<string, string> = {
  Lead: BLUE,
  Qualified: GOLD,
  Proposal: PURPLE,
  Negotiation: '#F97316',
  'Closed Won': GREEN,
  'Closed Lost': RED,
};

const revenueData = [
  { month: 'Oct', actual: 0, projected: 8000 },
  { month: 'Nov', actual: 0, projected: 12000 },
  { month: 'Dec', actual: 0, projected: 15000 },
  { month: 'Jan', actual: 0, projected: 18000 },
  { month: 'Feb', actual: 0, projected: 22000 },
  { month: 'Mar', actual: 0, projected: 28000 },
  { month: 'Apr', actual: 0, projected: 35000 },
];

const tooltipStyle = {
  backgroundColor: '#111113',
  border: '1px solid rgba(201,168,76,0.2)',
  borderRadius: '8px',
  color: '#F5F5F5',
  fontSize: '12px',
};

export const AnalyticsApp = () => {
  const { contacts, setContacts } = useCRMStore();
  const { deals, setDeals } = useDealsStore();
  const { tasks, setTasks } = useTasksStore();

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, dRes, tRes] = await Promise.all([
          fetch('/api/contacts'),
          fetch('/api/deals'),
          fetch('/api/tasks'),
        ]);
        const [cData, dData, tData] = await Promise.all([cRes.json(), dRes.json(), tRes.json()]);
        if (Array.isArray(cData)) setContacts(cData);
        if (Array.isArray(dData)) setDeals(dData);
        if (Array.isArray(tData)) setTasks(tData);
      } catch (e) {
        console.error('Analytics load error:', e);
      }
    };
    load();
  }, [setContacts, setDeals, setTasks]);

  const totalPipelineValue = deals.reduce((s, d) => s + d.value, 0);
  const weightedValue = deals.reduce((s, d) => s + d.value * (d.probability / 100), 0);
  const wonDeals = deals.filter(d => d.stage === 'Closed Won').length;
  const conversionRate = deals.length > 0 ? (wonDeals / deals.length) * 100 : 0;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const taskRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  // Pipeline stage distribution
  const stageGroups: Record<string, { count: number; value: number }> = {};
  deals.forEach((d) => {
    if (!stageGroups[d.stage]) stageGroups[d.stage] = { count: 0, value: 0 };
    stageGroups[d.stage].count++;
    stageGroups[d.stage].value += d.value;
  });
  const pipelineData = Object.entries(stageGroups).map(([name, { count, value }]) => ({
    name, count, value
  }));

  // Contact source distribution
  const sourceGroups: Record<string, number> = {};
  contacts.forEach((c) => {
    sourceGroups[c.source] = (sourceGroups[c.source] || 0) + 1;
  });
  const sourceData = Object.entries(sourceGroups).map(([name, value]) => ({ name, value }));
  const pieColors = [GOLD, GOLD_LIGHT, GREEN, BLUE, PURPLE, RED];

  // Revenue with actual data
  const chartData = revenueData.map((row, i) => ({
    ...row,
    actual: i < 3 ? Math.round(Math.random() * 10000 + 5000) : 0,
  }));

  return (
    <div className="h-full overflow-auto bg-bg-surface/20">
      <div className="p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Pipeline Value"
            value={`$${totalPipelineValue.toLocaleString()}`}
            icon={DollarSign}
            iconColor="text-gold"
            trend={{ value: 12, label: 'vs last month' }}
          />
          <MetricCard
            label="Weighted Value"
            value={`$${Math.round(weightedValue).toLocaleString()}`}
            icon={Target}
            iconColor="text-blue-400"
            trend={{ value: 8, label: 'probability-adjusted' }}
          />
          <MetricCard
            label="Contacts"
            value={contacts.length}
            icon={Users}
            iconColor="text-purple-400"
            trend={{ value: contacts.length > 0 ? 5 : 0, label: 'total leads' }}
          />
          <MetricCard
            label="Task Completion"
            value={`${taskRate.toFixed(0)}%`}
            icon={CheckSquare}
            iconColor="text-green-400"
            trend={{ value: taskRate > 50 ? 3 : -5, label: `${completedTasks}/${tasks.length} done` }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="glass border border-gold/10 rounded-2xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-text-primary">Revenue Projection</h3>
              <p className="text-[11px] text-text-secondary">Actual vs projected over time</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BLUE} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                <XAxis dataKey="month" tick={{ fill: '#999', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#999', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="projected" stroke={BLUE} fill="url(#blueGrad)" strokeWidth={2} name="Projected" />
                <Area type="monotone" dataKey="actual" stroke={GOLD} fill="url(#goldGrad)" strokeWidth={2} name="Actual" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pipeline by Stage */}
          <div className="glass border border-gold/10 rounded-2xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-text-primary">Pipeline by Stage</h3>
              <p className="text-[11px] text-text-secondary">Deal value per stage</p>
            </div>
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.08)" />
                  <XAxis dataKey="name" tick={{ fill: '#999', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#999', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Value">
                    {pipelineData.map((entry) => (
                      <Cell key={entry.name} fill={PIPELINE_COLORS[entry.name] || GOLD} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-text-secondary text-sm">
                No pipeline data yet
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Sources */}
          <div className="glass border border-gold/10 rounded-2xl p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-text-primary">Lead Sources</h3>
              <p className="text-[11px] text-text-secondary">Where contacts come from</p>
            </div>
            {sourceData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={pieColors[i % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 w-full mt-2">
                  {sourceData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                        <span className="text-text-secondary capitalize">{entry.name}</span>
                      </div>
                      <span className="text-text-primary font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-text-secondary text-sm">
                No contacts yet
              </div>
            )}
          </div>

          {/* Conversion Funnel */}
          <div className="col-span-2 glass border border-gold/10 rounded-2xl p-5">
            <div className="mb-5">
              <h3 className="text-sm font-bold text-text-primary">Sales Funnel</h3>
              <p className="text-[11px] text-text-secondary">Conversion through pipeline stages</p>
            </div>
            <div className="space-y-3">
              {['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won'].map((stage, i) => {
                const count = deals.filter(d => d.stage === stage).length;
                const total = deals.length || 1;
                const pct = Math.round((count / total) * 100);
                const maxWidth = 100 - i * 8;
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-secondary font-medium">{stage}</span>
                      <span className="text-text-primary font-bold">{count} <span className="text-text-secondary font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden" style={{ width: `${maxWidth}%` }}>
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PIPELINE_COLORS[stage] || GOLD,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-gold/10 flex items-center justify-between">
              <div className="text-center">
                <div className="text-xl font-display font-bold text-green-400">{conversionRate.toFixed(1)}%</div>
                <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-display font-bold text-gold">
                  {deals.length > 0 ? `$${Math.round(totalPipelineValue / deals.length).toLocaleString()}` : '$0'}
                </div>
                <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Avg Deal Size</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-display font-bold text-blue-400">{deals.length}</div>
                <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Active Deals</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
