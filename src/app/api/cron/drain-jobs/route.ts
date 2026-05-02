import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // no secret configured = open (dev only)
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

const AGENT_ROUTES: Record<string, string> = {
  ResearchAgent: '/api/agents/research',
  EnrichmentAgent: '/api/agents/enrichment',
  QualificationAgent: '/api/agents/qualification',
  PersonalizationAgent: '/api/agents/personalization',
  EmailAgent: '/api/agents/email',
  WhatsAppAgent: '/api/agents/whatsapp',
  CallAgent: '/api/agents/call',
  ReplyAgent: '/api/agents/reply',
  SchedulerAgent: '/api/agents/scheduler',
  CRMSyncAgent: '/api/agents/crm-sync',
  AuditAgent: '/api/agents/audit',
  SourceHealthAgent: '/api/agents/source-health',
  ComplianceAgent: '/api/agents/compliance',
  DeliverabilityAgent: '/api/agents/deliverability',
  OrchestratorAgent: '/api/agents/orchestrator',
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()
  const appUrl = process.env.APP_URL ?? `https://${process.env.VERCEL_URL}`

  const { data: jobs, error } = await supabaseAdmin
    .from('agent_jobs')
    .select('id, agent, payload, attempts, max_attempts')
    .eq('status', 'pending')
    .lte('run_at', now)
    .or(`locked_until.is.null,locked_until.lt.${now}`)
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const pending = (jobs ?? []) as Array<{ id: string; agent: string; payload: unknown; attempts: number; max_attempts: number }>

  if (pending.length === 0) {
    return NextResponse.json({ dispatched: 0 })
  }

  const jobIds = pending.map((j) => j.id)
  const lockUntil = new Date(Date.now() + 120_000).toISOString()

  await supabaseAdmin
    .from('agent_jobs')
    .update({ locked_until: lockUntil, updated_at: now })
    .in('id', jobIds)

  for (const job of pending) {
    const routePath = AGENT_ROUTES[job.agent]
    if (!routePath) {
      console.warn(`[drain-jobs] Unknown agent: ${job.agent}`)
      continue
    }

    void fetch(`${appUrl}${routePath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id }),
    }).catch((err: unknown) => {
      console.error(`[drain-jobs] Dispatch failed for job ${job.id}: ${(err as Error).message}`)
    })
  }

  return NextResponse.json({ dispatched: pending.length })
}
