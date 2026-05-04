import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { enrichContacts } from '@/v1/lib/apify'
import { triggerWhatsAppOutreach } from '@/v1/lib/actions/whatsapp-outreach'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { leadId } = await request.json()
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 })
    }

    const { data: lead, error: fetchErr } = await supabaseAdmin
      .from('leads').select('*').eq('id', leadId).single()

    if (fetchErr || !lead) {
      return NextResponse.json({ error: fetchErr?.message || 'Lead not found' }, { status: 404 })
    }

    let enrichedEmail: string | null = null
    if (lead.website) {
      const results = await enrichContacts([lead.website])
      if (results.length > 0 && results[0].emails.length > 0) {
        enrichedEmail = results[0].emails[0]
      }
    } else {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(lead.company)}`
      const results = await enrichContacts([searchUrl])
      if (results.length > 0 && results[0].emails.length > 0) {
        enrichedEmail = results[0].emails[0]
      }
    }

    if (enrichedEmail) {
      await supabaseAdmin.from('leads').update({ email: enrichedEmail, status: 'enriched' }).eq('id', leadId)
    }

    if (lead.phone) {
      const waResult = await triggerWhatsAppOutreach({
        id: lead.id, name: lead.company, city: lead.city || 'Dubai',
        country: lead.country || undefined, phone: lead.phone,
        business_type: lead.category || undefined, pain_point: lead.opportunity_summary || undefined
      }, true)

      if (waResult.success) {
        await supabaseAdmin.from('leads').update({ status: 'wa_sent' }).eq('id', leadId)
        return NextResponse.json({ success: true, status: 'wa_sent', enriched: { email: enrichedEmail }, message: 'WhatsApp outreach triggered.' })
      }
    }

    if (enrichedEmail) {
      return NextResponse.json({ success: true, status: 'enriched', enriched: { email: enrichedEmail } })
    }

    const fallbackStatus = lead.phone ? 'unreachable' : 'no_email'
    await supabaseAdmin.from('leads').update({ status: fallbackStatus }).eq('id', leadId)
    return NextResponse.json({ success: false, status: fallbackStatus, message: 'Contact info search yielded no results.' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
