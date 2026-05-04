import { NextRequest, NextResponse } from 'next/server'
import { triggerWhatsAppOutreach } from '@/v1/lib/actions/whatsapp-outreach'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const manualTo = searchParams.get('to')
    const manualName = searchParams.get('name') || 'Test User'

    let leadId = 'test-manual', leadPhone = manualTo, leadName = manualName, leadCity = 'Test City'

    if (!manualTo) {
      const { data: lead, error: fetchErr } = await supabaseAdmin
        .from('leads').select('*').not('phone', 'is', null)
        .or('city.ilike.%dubai%,city.ilike.%abu dhabi%,city.ilike.%riyadh%')
        .limit(1).single()

      if (fetchErr || !lead) {
        return NextResponse.json({ status: 'error', message: 'No GCC lead found. Provide ?to= parameter.' }, { status: 404 })
      }
      leadId = lead.id; leadPhone = lead.phone; leadName = lead.company; leadCity = lead.city || 'your area'
    }

    const result = await triggerWhatsAppOutreach(
      { id: leadId, name: leadName, city: leadCity, phone: leadPhone! }, !!manualTo
    )

    return NextResponse.json({
      success: result.success,
      target: { id: leadId, name: leadName, phone: leadPhone, city: leadCity },
      outreachResult: result,
      config: { from: process.env.TWILIO_WHATSAPP_FROM, templateSid: process.env.TWILIO_WHATSAPP_TEMPLATE_SID || 'MISSING' }
    })
  } catch (err: any) {
    return NextResponse.json({ status: 'error', message: err.message }, { status: 500 })
  }
}
