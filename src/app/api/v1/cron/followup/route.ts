import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, cronUnauthorized } from '@/v1/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) return cronUnauthorized()
  try {
    // Fetch leads that were contacted 3+ days ago but haven't received follow-up
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const { data: leads } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('status', 'contacted')
      .lt('contacted_at', threeDaysAgo)
      .is('followup_sent_at', null)
      .limit(20)

    if (!leads || leads.length === 0) {
      return NextResponse.json({ status: 'complete', followedUp: 0, message: 'No leads need follow-up' })
    }

    let followedUp = 0
    for (const lead of leads) {
      await supabaseAdmin.from('leads').update({
        followup_sent_at: new Date().toISOString(),
        status: 'followed_up'
      }).eq('id', lead.id)
      followedUp++
    }

    return NextResponse.json({ status: 'complete', followedUp })
  } catch (error: any) {
    return NextResponse.json({ status: 'failed', error: error.message }, { status: 200 })
  }
}
