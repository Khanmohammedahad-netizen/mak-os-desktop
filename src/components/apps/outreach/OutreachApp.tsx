"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Send, ListChecks, MessageSquare, Loader2,
  CheckCircle2, XCircle, Clock, Zap, RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentJob {
  id: string
  agent: string
  status: string
  attempts: number
  created_at: string
  updated_at: string
}

interface OutreachLog {
  id: string
  channel: string
  direction: string
  status: string
  body: string | null
  created_at: string
  contact_id: string | null
}

interface QueueStats {
  pending: number
  running: number
  done: number
  failed: number
}

type Tab = 'command' | 'queue' | 'logs'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  running:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  done:     'text-green-400 bg-green-400/10 border-green-400/20',
  failed:   'text-red-400 bg-red-400/10 border-red-400/20',
  retry:    'text-orange-400 bg-orange-400/10 border-orange-400/20',
}

const CHANNEL_ICONS: Record<string, string> = {
  email:    '✉',
  whatsapp: '💬',
  voice:    '📞',
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', STATUS_COLORS[status] ?? 'text-text-secondary bg-white/5 border-white/10')}>
      {status}
    </span>
  )
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-3 bg-white/3 rounded-xl border border-gold/5">
      <span className={cn('text-2xl font-bold tabular-nums', color)}>{value}</span>
      <span className="text-[10px] text-text-secondary mt-0.5 uppercase tracking-wider">{label}</span>
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

// ─── Command Tab ──────────────────────────────────────────────────────────────

function CommandTab() {
  const [goal, setGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ jobId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])

  const launch = useCallback(async () => {
    const trimmed = goal.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: trimmed }),
      })
      const data = await res.json() as { job_id?: string; error?: string }
      if (!res.ok || !data.job_id) {
        setError(data.error ?? `HTTP ${res.status}`)
      } else {
        setResult({ jobId: data.job_id })
        setHistory((prev) => [trimmed, ...prev].slice(0, 5))
        setGoal('')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [goal, loading])

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') launch()
  }

  return (
    <div className="flex flex-col h-full p-5 gap-4">
      {/* Input */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest">
          Outreach Goal
        </label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={handleKey}
          placeholder="e.g. Find 50 restaurants in Dubai and send cold outreach"
          rows={4}
          className="w-full bg-white/5 border border-gold/20 rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary/40 resize-none focus:outline-none focus:ring-1 focus:ring-gold/40 transition-all"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-secondary/50">⌘↩ to launch</span>
          <button
            onClick={launch}
            disabled={loading || !goal.trim()}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all',
              'bg-gold/15 border border-gold/30 text-gold hover:bg-gold/25',
              (loading || !goal.trim()) && 'opacity-40 cursor-not-allowed'
            )}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            Launch Mission
          </button>
        </div>
      </div>

      {/* Result banner */}
      {result && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-green-400">Mission launched</p>
            <p className="text-[11px] text-text-secondary mt-0.5 font-mono truncate">job: {result.jobId}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-red-400">{error}</p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold text-text-secondary/60 uppercase tracking-widest">Recent Goals</p>
          {history.map((g, i) => (
            <button
              key={i}
              onClick={() => setGoal(g)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[12px] text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all group"
            >
              <ChevronRight size={12} className="flex-shrink-0 opacity-40 group-hover:opacity-100" />
              <span className="truncate">{g}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tip */}
      {history.length === 0 && !result && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Send size={28} className="text-gold/20 mx-auto" />
            <p className="text-[12px] text-text-secondary/50 max-w-[240px]">
              Describe an outreach goal. The AI decomposes it into a research query, finds leads, enriches them, and sends personalized messages autonomously.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Queue Tab ────────────────────────────────────────────────────────────────

function QueueTab() {
  const [jobs, setJobs] = useState<AgentJob[]>([])
  const [stats, setStats] = useState<QueueStats>({ pending: 0, running: 0, done: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase
      .from('agent_jobs')
      .select('id, agent, status, attempts, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(50)

    const rows = (data ?? []) as AgentJob[]
    setJobs(rows)
    setStats({
      pending: rows.filter((j) => j.status === 'pending').length,
      running: rows.filter((j) => j.status === 'running').length,
      done:    rows.filter((j) => j.status === 'done').length,
      failed:  rows.filter((j) => j.status === 'failed').length,
    })
    setLoading(false)
    setLastRefresh(Date.now())
  }, [])

  useEffect(() => {
    fetchJobs()
    const interval = setInterval(fetchJobs, 10_000)
    return () => clearInterval(interval)
  }, [fetchJobs])

  return (
    <div className="flex flex-col h-full">
      {/* Stats row */}
      <div className="flex gap-2 p-4 flex-shrink-0">
        <StatBox label="Pending" value={stats.pending} color="text-amber-400" />
        <StatBox label="Running" value={stats.running} color="text-blue-400" />
        <StatBox label="Done"    value={stats.done}    color="text-green-400" />
        <StatBox label="Failed"  value={stats.failed}  color="text-red-400" />
      </div>

      {/* Refresh line */}
      <div className="flex items-center justify-between px-4 pb-2 flex-shrink-0">
        <span className="text-[10px] text-text-secondary/40">Refreshes every 10s · {jobs.length} jobs</span>
        <button onClick={fetchJobs} className="flex items-center gap-1 text-[10px] text-text-secondary/50 hover:text-gold transition-colors">
          <RefreshCw size={10} />
          {timeAgo(new Date(lastRefresh).toISOString())}
        </button>
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
        {loading && (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={18} className="text-gold/40 animate-spin" />
          </div>
        )}
        {!loading && jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <Clock size={20} className="text-gold/20" />
            <p className="text-[12px] text-text-secondary/40">No jobs yet. Launch a mission.</p>
          </div>
        )}
        {jobs.map((job) => (
          <div key={job.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/3 border border-gold/5 hover:border-gold/15 transition-all">
            <StatusPill status={job.status} />
            <span className="flex-1 text-[12px] text-text-primary font-mono truncate">{job.agent}</span>
            <span className="text-[10px] text-text-secondary/50 flex-shrink-0">{timeAgo(job.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────

function LogsTab() {
  const [logs, setLogs] = useState<OutreachLog[]>([])
  const [loading, setLoading] = useState(true)
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  const fetchLogs = useCallback(async () => {
    let query = supabase
      .from('outreach_logs')
      .select('id, channel, direction, status, body, created_at, contact_id')
      .order('created_at', { ascending: false })
      .limit(100)

    if (channelFilter !== 'all') {
      query = query.eq('channel', channelFilter)
    }

    const { data } = await query
    setLogs((data ?? []) as OutreachLog[])
    setLoading(false)
    setLastRefresh(Date.now())
  }, [channelFilter])

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 10_000)
    return () => clearInterval(interval)
  }, [fetchLogs])

  const CHANNELS = ['all', 'email', 'whatsapp', 'voice']

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gold/5 flex-shrink-0">
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            onClick={() => setChannelFilter(ch)}
            className={cn(
              'px-3 py-1 rounded-full text-[11px] font-medium border transition-all',
              channelFilter === ch
                ? 'bg-gold/20 border-gold/30 text-gold'
                : 'bg-transparent border-gold/10 text-text-secondary hover:border-gold/20 hover:text-text-primary'
            )}
          >
            {ch === 'all' ? 'All' : `${CHANNEL_ICONS[ch] ?? ''} ${ch}`}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={fetchLogs} className="flex items-center gap-1 text-[10px] text-text-secondary/50 hover:text-gold transition-colors">
          <RefreshCw size={10} />
          {timeAgo(new Date(lastRefresh).toISOString())}
        </button>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {loading && (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={18} className="text-gold/40 animate-spin" />
          </div>
        )}
        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 gap-2">
            <MessageSquare size={20} className="text-gold/20" />
            <p className="text-[12px] text-text-secondary/40">No outreach logs yet.</p>
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-white/3 border border-gold/5 hover:border-gold/15 transition-all">
            <span className="text-base flex-shrink-0 mt-0.5">{CHANNEL_ICONS[log.channel] ?? '📨'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-semibold text-text-secondary uppercase">{log.channel}</span>
                <span className="text-[10px] text-text-secondary/40">{log.direction}</span>
                <StatusPill status={log.status} />
              </div>
              {log.body && (
                <p className="text-[12px] text-text-secondary truncate">{log.body}</p>
              )}
            </div>
            <span className="text-[10px] text-text-secondary/40 flex-shrink-0 mt-0.5">{timeAgo(log.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'command', label: 'Command',   icon: Send },
  { id: 'queue',   label: 'Queue',     icon: ListChecks },
  { id: 'logs',    label: 'Logs',      icon: MessageSquare },
]

export const OutreachApp = () => {
  const [tab, setTab] = useState<Tab>('command')

  return (
    <div className="flex flex-col h-full bg-bg-surface/30">
      {/* Tab bar */}
      <div className="flex items-center px-5 border-b border-gold/10 bg-white/3 flex-shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors',
              tab === id ? 'text-gold' : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <Icon size={14} />
            {label}
            {tab === id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'command' && <CommandTab />}
        {tab === 'queue'   && <QueueTab />}
        {tab === 'logs'    && <LogsTab />}
      </div>
    </div>
  )
}
