// src/lib/channels/brevo.ts
import { createClient } from '@/lib/supabase-server'

export type EmailOk = { ok: true; brevoId: string }
export type EmailCapped = { ok: false; reason: 'DAILY_LIMIT_REACHED' }
export type EmailErr = { ok: false; reason: 'API_ERROR'; status: number }
export type EmailResult = EmailOk | EmailCapped | EmailErr

interface SendEmailArgs {
  to: string
  contactId: string
  subject: string
  html: string
  replyTo?: string
}

export async function sendEmail({
  to,
  contactId,
  subject,
  html,
  replyTo,
}: SendEmailArgs): Promise<EmailResult> {
  const db = createClient()

  const limit = parseInt(process.env.DAILY_EMAIL_LIMIT ?? '250', 10)

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const { data: countData } = await db
    .from('outreach_logs')
    .select('count')
    .eq('channel', 'email')
    .eq('direction', 'outbound')
    .gte('created_at', todayStart.toISOString())
    .single()

  const dailyCount = (countData as { count: number } | null)?.count ?? 0

  if (dailyCount >= limit) {
    return { ok: false, reason: 'DAILY_LIMIT_REACHED' }
  }

  const payload: Record<string, unknown> = {
    sender: {
      email: process.env.OUTREACH_FROM_EMAIL,
      name: process.env.OUTREACH_FROM_NAME,
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  }

  if (replyTo !== undefined) {
    payload.replyTo = { email: replyTo }
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY ?? '',
    },
    body: JSON.stringify(payload),
  })

  const json = (await res.json()) as Record<string, unknown>

  if (res.ok) {
    await db.from('outreach_logs').insert({
      contact_id: contactId,
      channel: 'email',
      direction: 'outbound',
      status: 'sent',
      subject,
      brevo_id: json.messageId,
    })

    return { ok: true, brevoId: json.messageId as string }
  }

  await db.from('outreach_logs').insert({
    contact_id: contactId,
    channel: 'email',
    direction: 'outbound',
    status: 'failed',
    subject,
    metadata: { brevo_error: json },
  })

  return { ok: false, reason: 'API_ERROR', status: res.status }
}
