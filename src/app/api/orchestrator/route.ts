import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json() as { goal?: string }
  if (!body.goal) {
    return NextResponse.json({ error: 'Missing goal' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('agent_jobs')
    .insert({
      agent: 'OrchestratorAgent',
      payload: { goal: body.goal },
      status: 'pending',
      run_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({ job_id: (data as { id: string }).id })
}
