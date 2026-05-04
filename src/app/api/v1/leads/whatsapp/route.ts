import { NextRequest, NextResponse } from 'next/server'
import { triggerWhatsAppOutreach } from '@/v1/lib/actions/whatsapp-outreach'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json()
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const { data: lead, error: fetchErr } = await supabaseAdmin
      .from('leads').select('*').eq('id', leadId).single()

    if (fetchErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    if (!lead.phone) return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 })

    const result = await triggerWhatsAppOutreach({
      id: lead.id, name: lead.company, city: lead.city || 'your area', phone: lead.phone
    })

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'WhatsApp send failed' }, { status: 500 })
    }

    await supabaseAdmin.from('leads').update({
      status: 'contacted', whatsapp_status: 'sent', whatsapp_sent_at: new Date().toISOString(),
      whatsapp_message_sid: result.sid, contacted_at: new Date().toISOString()
    }).eq('id', lead.id)

    await supabaseAdmin.from('outreach_log').insert({
      lead_id: lead.id, business_name: lead.company, touch_number: 1, send_status: 'sent',
      sent_at: new Date().toISOString(), channel: 'whatsapp', whatsapp_status: 'sent',
      whatsapp_message_sid: result.sid, whatsapp_message_body: result.body, message_sid: result.sid
    })

    return NextResponse.json({ success: true, sid: result.sid })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
