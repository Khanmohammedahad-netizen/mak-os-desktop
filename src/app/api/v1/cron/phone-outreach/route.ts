import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, cronUnauthorized } from '@/v1/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export const maxDuration = 300

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) return cronUnauthorized()
  try {
    const { data: leads } = await supabaseAdmin
      .from('leads')
      .select('*')
      .not('phone', 'is', null)
      .in('status', ['enriched', 'new'])
      .is('whatsapp_sent_at', null)
      .limit(10)

    if (!leads || leads.length === 0) {
      return NextResponse.json({ status: 'complete', sent: 0, message: 'No phone leads to outreach' })
    }

    const { triggerWhatsAppOutreach } = await import('@/v1/lib/actions/whatsapp-outreach')
    let sent = 0
    for (const lead of leads) {
      const result = await triggerWhatsAppOutreach({
        id: lead.id, name: lead.company, city: lead.city || 'your area', phone: lead.phone
      }, true)
      if (result.success) sent++
    }

    return NextResponse.json({ status: 'complete', sent, total: leads.length })
  } catch (error: any) {
    return NextResponse.json({ status: 'failed', error: error.message }, { status: 200 })
  }
}
