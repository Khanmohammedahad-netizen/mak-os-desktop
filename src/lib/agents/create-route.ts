import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { runAgent } from '@/lib/agents/base'
import type { Agent } from '@/lib/agents/base'

export function createAgentRoute<I, O>(agent: Agent<I, O>) {
  return async function POST(req: NextRequest) {
    const body = await req.json() as { job_id?: string }
    if (!body.job_id) {
      return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })
    }

    const { data: job, error } = await supabaseAdmin
      .from('agent_jobs')
      .select('id, payload, attempts, max_attempts')
      .eq('id', body.job_id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const result = await runAgent(agent, job as { id: string; payload: unknown; attempts: number; max_attempts: number })
    return NextResponse.json(result)
  }
}
