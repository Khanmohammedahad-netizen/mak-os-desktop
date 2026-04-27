"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Users, Handshake, DollarSign, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { MetricCard } from './MetricCard';

// ─── constants ───────────────────────────────────────────────────────────────

const GOLD = '#C9A84C';

const PIPELINE_COLORS: Record<string, string> = {
  Lead: '#4A9EFF',
  Qualified: '#C9A84C',
  Proposal: '#A855F7',
  Negotiation: '#F97316',
  'Closed Won': '#28C840',
  'Closed Lost': '#FF5F57',
};

const DONUT_COLORS = ['#C9A84C', '#4A9EFF', '#28C840', '#A855F7', '#F97316', '#FF5F57'];

const STATUS_ORDER = ['New', 'Contacted', 'Meeting Set', 'Demo Given', 'Proposal Sent', 'Won', 'Lost'];

const STAGE_ORDER = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const tooltipStyle: React.CSSProperties = {
  backgroundColor: '#111113',
  border: '1px solid rgba(201,168,76,0.3)',
  borderRadius: '8px',
  color: '#F5F5F5',
  fontSize: '12px',
};

// ─── types ───────────────────────────────────────────────────────────────────

interface Overview { totalContacts: number; activeDeals: number; pipelineValue: number; winRate: number }
interface StatusRow { status: string; count: number }
interface StageRow { stage: string; count: number; value: number }
interface MonthRow { month: string; value: number }
interface SourceRow { source: string; count: number }
interface DayRow { day: string; count: number }

// ─── mock data ───────────────────────────────────────────────────────────────

const MOCK_OVERVIEW: Overview = { totalContacts: 41, activeDeals: 8, pipelineValue: 375500, winRate: 50 };

const MOCK_STATUS: StatusRow[] = [
  { status: 'New', count: 12 },
  { status: 'Contacted', count: 9 },
  { status: 'Meeting Set', count: 6 },
  { status: 'Demo Given', count: 4 },
  { status: 'Proposal Sent', count: 3 },
  { status: 'Won', count: 5 },
  { status: 'Lost', count: 2 },
];

const MOCK_STAGES: StageRow[] = [
  { stage: 'Lead', count: 3, value: 68500 },
  { stage: 'Qualified', count: 2, value: 54500 },
  { stage: 'Proposal', count: 2, value: 73500 },
  { stage: 'Negotiation', count: 1, value: 85000 },
  { stage: 'Closed Won', count: 1, value: 120000 },
  { stage: 'Closed Lost', count: 1, value: 34000 },
];

const MOCK_PIPELINE: MonthRow[] = [
  { month: 'Nov', value: 185000 },
  { month: 'Dec', value: 210000 },
  { month: 'Jan', value: 192000 },
  { month: 'Feb', value: 248000 },
  { month: 'Mar', value: 287000 },
  { month: 'Apr', value: 321000 },
];

const MOCK_SOURCES: SourceRow[] = [
  { source: 'Manual', count: 15 },
  { source: 'LinkedIn', count: 9 },
  { source: 'Referral', count: 7 },
  { source: 'Website', count: 5 },
  { source: 'Cold Outreach', count: 3 },
  { source: 'MAK OS v1', count: 2 },
];

// deterministic daily counts (seed-based, relative to today)
function buildActivityMock(): DayRow[] {
  const seed = [3, 5, 2, 7, 4, 6, 1, 8, 3, 5, 2, 7, 4, 6, 0, 8, 3, 5, 2, 7, 4, 6, 1, 8, 3, 5, 2, 7, 4, 6];
  return Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      day: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: seed[i],
    };
  });
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const ChartCard = ({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gold/10 p-5" style={{ backgroundColor: '#111113' }}>
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {sub && <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>}
    </div>
    {children}
  </div>
);

const Empty = ({ h = 180 }: { h?: number }) => (
  <div className="flex items-center justify-center text-text-secondary text-sm" style={{ height: h }}>
    No data yet
  </div>
);

// ─── component ───────────────────────────────────────────────────────────────

export const AnalyticsApp = () => {
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  const activityMock = useMemo(buildActivityMock, []);

  const [overview, setOverview] = useState<Overview>({ totalContacts: 0, activeDeals: 0, pipelineValue: 0, winRate: 0 });
  const [contactsByStatus, setContactsByStatus] = useState<StatusRow[]>([]);
  const [dealsByStage, setDealsByStage] = useState<StageRow[]>([]);
  const [pipelineHistory, setPipelineHistory] = useState<MonthRow[]>([]);
  const [leadSources, setLeadSources] = useState<SourceRow[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMock) {
      setOverview(MOCK_OVERVIEW);
      setContactsByStatus(MOCK_STATUS);
      setDealsByStage(MOCK_STAGES);
      setPipelineHistory(MOCK_PIPELINE);
      setLeadSources(MOCK_SOURCES);
      setActivityTimeline(activityMock);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const types = ['overview', 'contacts-by-status', 'deals-by-stage', 'pipeline-history', 'lead-sources', 'activity-timeline'];
        const results = await Promise.all(
          types.map((t) => fetch(`/api/analytics?type=${t}`).then((r) => r.json()))
        );
        setOverview(results[0]);
        setContactsByStatus(
          (results[1] as StatusRow[]).sort(
            (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
          )
        );
        setDealsByStage(
          (results[2] as StageRow[]).sort(
            (a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
          )
        );
        setPipelineHistory(results[3]);
        setLeadSources(results[4]);
        setActivityTimeline(results[5]);
      } catch (e) {
        console.error('Analytics load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isMock, activityMock]);

  const fmtK = (v: number) => `$${(v / 1000).toFixed(0)}k`;
  const fmtFull = (v: number) => `$${v.toLocaleString()}`;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-surface/20">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-bg-surface/20">
      <div className="p-6 space-y-5">

        {/* ── Metric Cards ── */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Total Contacts"
            value={overview.totalContacts}
            sub="All time"
            icon={Users}
            iconColor="text-purple-400"
          />
          <MetricCard
            label="Active Deals"
            value={overview.activeDeals}
            sub="Excluding closed"
            icon={Handshake}
            iconColor="text-blue-400"
          />
          <MetricCard
            label="Pipeline Value"
            value={fmtFull(overview.pipelineValue)}
            sub="Active deals only"
            icon={DollarSign}
            iconColor="text-gold"
          />
          <MetricCard
            label="Win Rate"
            value={`${overview.winRate.toFixed(1)}%`}
            sub="Won / (Won + Lost)"
            icon={TrendingUp}
            iconColor="text-green-400"
          />
        </div>

        {/* ── Row 1: Status + Stage ── */}
        <div className="grid grid-cols-2 gap-5">

          <ChartCard title="Contacts by Status" sub="Distribution across pipeline stages">
            {contactsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={contactsByStatus} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="hBarGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#999', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="status" tick={{ fill: '#999', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(201,168,76,0.05)' }} />
                  <Bar dataKey="count" fill="url(#hBarGrad)" radius={[0, 4, 4, 0]} name="Contacts" barSize={13} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </ChartCard>

          <ChartCard title="Deals by Stage" sub="Deal value distribution across kanban stages">
            {dealsByStage.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={dealsByStage} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fill: '#999', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#999', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(201,168,76,0.05)' }} formatter={(v) => [fmtFull(Number(v)), 'Value']} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Value" barSize={30}>
                    {dealsByStage.map((entry) => (
                      <Cell key={entry.stage} fill={PIPELINE_COLORS[entry.stage] || GOLD} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </ChartCard>

        </div>

        {/* ── Row 2: Pipeline History + Lead Sources ── */}
        <div className="grid grid-cols-2 gap-5">

          <ChartCard title="Pipeline Value Over Time" sub="Monthly pipeline totals — last 6 months">
            {pipelineHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={pipelineHistory} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="pipeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#999', fontSize: 11, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#999', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtFull(Number(v)), 'Pipeline']} />
                  <Area type="monotone" dataKey="value" stroke={GOLD} strokeWidth={2} fill="url(#pipeGrad)" name="Pipeline" dot={{ fill: GOLD, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </ChartCard>

          <ChartCard title="Lead Sources" sub="Contact acquisition channels">
            {leadSources.length > 0 ? (
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <ResponsiveContainer width={170} height={170}>
                    <PieChart>
                      <Pie
                        data={leadSources}
                        dataKey="count"
                        nameKey="source"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {leadSources.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5 pt-2">
                  {leadSources.map((entry, i) => (
                    <div key={entry.source} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                        <span className="text-text-secondary capitalize">{entry.source}</span>
                      </div>
                      <span className="text-text-primary font-semibold tabular-nums">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <Empty />}
          </ChartCard>

        </div>

        {/* ── Row 3: Activity Timeline (full width) ── */}
        <ChartCard title="Activity Timeline" sub="Events logged per day — last 30 days">
          {activityTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={activityTimeline} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(201,168,76,0.06)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#999', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis tick={{ fill: '#999', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke={GOLD}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, fill: GOLD, strokeWidth: 0 }}
                  name="Events"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty h={140} />}
        </ChartCard>

      </div>
    </div>
  );
};
