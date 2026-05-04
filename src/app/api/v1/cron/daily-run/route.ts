import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, cronUnauthorized } from '@/v1/lib/cron-auth'
import { runOutreachPipeline } from '@/v1/lib/outreach-engine'
import { supabaseAdmin } from '@/lib/supabase-server'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) return cronUnauthorized()

  const runId = crypto.randomUUID()
  try {
    const { data: config, error: configErr } = await supabaseAdmin
      .from('scheduler_config').select('*').limit(1).single()

    if (configErr) throw new Error('Could not fetch scheduler config')
    if (!config.scheduler_enabled) {
      return NextResponse.json({ status: 'skipped', reason: 'Scheduler is disabled by operator' })
    }

    const { data: todayCitiesData } = await supabaseAdmin.from('todays_cities').select('*').single()
    const todaysCities: string[] = todayCitiesData?.cities_today || config.cities || ['Dallas']

    await supabaseAdmin.from('pipeline_runs').insert({ id: runId, status: 'running', created_at: new Date().toISOString() })

    const results = []
    for (const city of todaysCities) {
      const result = await runOutreachPipeline('restaurant', city, supabaseAdmin, { maxResults: 20, queuedMode: true })
      results.push({ city, result })
    }

    await supabaseAdmin.from('pipeline_runs').update({ status: 'complete', error: null }).eq('id', runId)
    return NextResponse.json({ status: 'complete', runId, cities: todaysCities, results })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await supabaseAdmin.from('pipeline_runs').update({ status: 'failed', error: errorMessage }).eq('id', runId)
    return NextResponse.json({ status: 'failed', runId, error: errorMessage }, { status: 200 })
  }
}
