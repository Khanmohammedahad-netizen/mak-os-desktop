import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, cronUnauthorized } from '@/v1/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) return cronUnauthorized()
  try {
    const { data: logs } = await supabaseAdmin
      .from('outreach_log')
      .select('*')
      .eq('channel', 'email')
      .eq('send_status', 'sent')
      .is('reply_checked_at', null)
      .limit(50)

    if (!logs || logs.length === 0) {
      return NextResponse.json({ status: 'complete', checked: 0 })
    }

    // Mark as checked (actual reply detection depends on webhook integration)
    let checked = 0
    for (const log of logs) {
      await supabaseAdmin.from('outreach_log').update({
        reply_checked_at: new Date().toISOString()
      }).eq('id', log.id)
      checked++
    }

    return NextResponse.json({ status: 'complete', checked })
  } catch (error: any) {
    return NextResponse.json({ status: 'failed', error: error.message }, { status: 200 })
  }
}
