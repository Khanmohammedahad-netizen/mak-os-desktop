import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendOutreachEmail } from '@/v1/lib/email/service'
import { buildOutreachVariants } from '@/v1/lib/zoho-mail'

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
    if (!lead.email) {
      return NextResponse.json({ error: 'Lead has no email. Enrich the lead first.' }, { status: 400 })
    }
    if (lead.status === 'emailed') {
      return NextResponse.json({ error: 'Email already sent to this lead.' }, { status: 409 })
    }

    const variants = buildOutreachVariants({
      company: lead.company,
      city: lead.city || 'your area',
      category: lead.category || null,
    })
    const { subject, body: text } = variants[0]

    const mailResult = await sendOutreachEmail({
      to: lead.email, subject, body: text,
      fromEmail: process.env.OUTREACH_FROM_EMAIL
    })

    if (!mailResult.success) {
      return NextResponse.json({ error: mailResult.error || 'Failed sending' }, { status: 500 })
    }

    await supabaseAdmin.from('leads').update({
      status: 'contacted', email_status: 'sent', email_sent_at: new Date().toISOString()
    }).eq('id', leadId)

    return NextResponse.json({ success: true, messageId: mailResult.messageId, sentTo: lead.email, subject })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
