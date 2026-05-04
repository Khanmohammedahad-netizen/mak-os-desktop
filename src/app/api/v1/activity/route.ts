import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  try {
    // Combine outreach_log and pipeline_runs into a unified activity feed
    const { data: outreachLogs } = await supabaseAdmin
      .from('outreach_log')
      .select('id, lead_id, business_name, channel, send_status, sent_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: pipelineRuns } = await supabaseAdmin
      .from('pipeline_runs')
      .select('id, status, created_at, error')
      .order('created_at', { ascending: false })
      .limit(20)

    const activity = [
      ...(outreachLogs || []).map(log => ({
        id: log.id, type: 'outreach' as const,
        title: `${log.channel?.toUpperCase()} to ${log.business_name || 'Unknown'}`,
        status: log.send_status, timestamp: log.sent_at || log.created_at,
      })),
      ...(pipelineRuns || []).map(run => ({
        id: run.id, type: 'pipeline' as const,
        title: `Pipeline Run`,
        status: run.status, timestamp: run.created_at, error: run.error,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ activity })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
