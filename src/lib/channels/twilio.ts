/**
 * Twilio channel adapter for WhatsApp messaging.
 *
 * Provides:
 *  - sendWhatsAppTemplate  — template message via Content API (HSM)
 *  - sendWhatsAppFreeform  — free-text reply within the 24-hour service window
 *  - lookupWhatsApp        — line-type intelligence with 30-day DB cache
 *  - verifyTwilioSignature — HMAC-SHA1 webhook signature validation
 *
 * All send operations write an outreach_log row regardless of success/failure.
 */

import { createHmac } from 'crypto'
import { createClient } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Return types (discriminated unions)
// ---------------------------------------------------------------------------

export type WhatsAppSendOk = {
  ok: true
  sid: string
  status: string
}

export type WhatsAppSendError = {
  ok: false
  errorCode: number
  errorMessage: string
}

export type WhatsAppSendResult = WhatsAppSendOk | WhatsAppSendError

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function twilioBaseUrl(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID
  if (!sid) throw new Error('TWILIO_ACCOUNT_SID is not set')
  return `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
}

function basicAuthHeader(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('Twilio credentials not configured')
  return 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64')
}

async function postToTwilio(params: URLSearchParams): Promise<Response> {
  return fetch(twilioBaseUrl(), {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
}

async function logOutreach(opts: {
  contactId: string
  channel: string
  direction: string
  status: string
  subject?: string
  body?: string
  twilioSid?: string
  twilioErrorCode?: number
  twilioErrorMessage?: string
}): Promise<void> {
  const db = createClient()
  await db.from('outreach_logs').insert({
    contact_id: opts.contactId,
    channel: opts.channel,
    direction: opts.direction,
    status: opts.status,
    subject: opts.subject ?? null,
    body: opts.body ?? null,
    twilio_sid: opts.twilioSid ?? null,
    twilio_error_code: opts.twilioErrorCode ?? null,
    twilio_error_message: opts.twilioErrorMessage ?? null,
  })
}

// ---------------------------------------------------------------------------
// sendWhatsAppTemplate
// ---------------------------------------------------------------------------

export async function sendWhatsAppTemplate(args: {
  to: string
  contactId: string
  businessName: string
  city: string
}): Promise<WhatsAppSendResult> {
  const from = process.env.TWILIO_WHATSAPP_FROM
  const templateSid = process.env.TWILIO_WHATSAPP_TEMPLATE_SID

  if (!from) throw new Error('TWILIO_WHATSAPP_FROM is not set')
  if (!templateSid) throw new Error('TWILIO_WHATSAPP_TEMPLATE_SID is not set')

  const params = new URLSearchParams({
    To: `whatsapp:${args.to}`,
    From: `whatsapp:${from}`,
    ContentSid: templateSid,
    ContentVariables: JSON.stringify({ '1': args.businessName, '2': args.city }),
  })

  const response = await postToTwilio(params)

  if (response.ok) {
    const data = (await response.json()) as { sid: string; status: string }
    await logOutreach({
      contactId: args.contactId,
      channel: 'whatsapp',
      direction: 'outbound',
      status: data.status,
      subject: `template:${templateSid}`,
      twilioSid: data.sid,
    })
    return { ok: true, sid: data.sid, status: data.status }
  }

  const err = (await response.json()) as { code: number; message: string; status: number }
  await logOutreach({
    contactId: args.contactId,
    channel: 'whatsapp',
    direction: 'outbound',
    status: 'failed',
    subject: `template:${templateSid}`,
    twilioErrorCode: err.code,
    twilioErrorMessage: err.message,
  })
  return { ok: false, errorCode: err.code, errorMessage: err.message }
}

// ---------------------------------------------------------------------------
// sendWhatsAppFreeform
// ---------------------------------------------------------------------------

/**
 * Sends a free-text WhatsApp message.
 * NOTE: Twilio's 24-hour service-window compliance check must be enforced by
 * the caller (compliance gate) before invoking this function.
 */
export async function sendWhatsAppFreeform(args: {
  to: string
  contactId: string
  body: string
}): Promise<WhatsAppSendResult> {
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!from) throw new Error('TWILIO_WHATSAPP_FROM is not set')

  const params = new URLSearchParams({
    To: `whatsapp:${args.to}`,
    From: `whatsapp:${from}`,
    Body: args.body,
  })

  const response = await postToTwilio(params)

  if (response.ok) {
    const data = (await response.json()) as { sid: string; status: string }
    await logOutreach({
      contactId: args.contactId,
      channel: 'whatsapp',
      direction: 'outbound',
      status: data.status,
      body: args.body,
      twilioSid: data.sid,
    })
    return { ok: true, sid: data.sid, status: data.status }
  }

  const err = (await response.json()) as { code: number; message: string; status: number }
  await logOutreach({
    contactId: args.contactId,
    channel: 'whatsapp',
    direction: 'outbound',
    status: 'failed',
    body: args.body,
    twilioErrorCode: err.code,
    twilioErrorMessage: err.message,
  })
  return { ok: false, errorCode: err.code, errorMessage: err.message }
}

// ---------------------------------------------------------------------------
// lookupWhatsApp
// ---------------------------------------------------------------------------

/**
 * Checks whether `phone` is a registered WhatsApp number.
 *
 * Cache strategy: whatsapp_lookups table keyed by phone (E.164).
 * Cache TTL: 30 days (expires_at column). On cache miss or expiry, calls
 * the Twilio Lookups v2 API and upserts the result.
 */
export async function lookupWhatsApp(phone: string): Promise<boolean> {
  const db = createClient()
  const now = new Date().toISOString()

  // Check cache
  const { data: cached } = await db
    .from('whatsapp_lookups')
    .select('registered')
    .eq('phone', phone)
    .gt('expires_at', now)
    .single()

  if (cached !== null && cached !== undefined) {
    return (cached as { registered: boolean }).registered
  }

  // Cache miss — call Twilio Lookups v2
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) throw new Error('Twilio credentials not configured')

  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phone)}?Fields=line_type_intelligence`
  const resp = await fetch(url, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
    },
  })

  const raw = (await resp.json()) as Record<string, unknown>

  // Twilio indicates WhatsApp registration via line_type_intelligence.mobile_country_code
  // and the `whatsapp` field (when available). We treat any successful response where
  // line_type_intelligence exists as "registered = true" for the number being reachable,
  // but check for an explicit `whatsapp` boolean if present.
  const lti = raw['line_type_intelligence'] as Record<string, unknown> | null | undefined
  let registered = false
  if (lti) {
    if (typeof lti['whatsapp'] === 'boolean') {
      registered = lti['whatsapp']
    } else {
      // Default: treat a valid mobile number as potentially WhatsApp-registered
      const lineType = lti['type'] as string | undefined
      registered = lineType === 'mobile' || lineType === 'voip'
    }
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await db.from('whatsapp_lookups').upsert({
    phone,
    line_type: (lti?.['type'] as string | undefined) ?? null,
    registered,
    raw_response: raw,
    looked_up_at: now,
    expires_at: expiresAt,
  })

  return registered
}

// ---------------------------------------------------------------------------
// verifyTwilioSignature
// ---------------------------------------------------------------------------

/**
 * Validates an inbound Twilio webhook signature.
 *
 * Algorithm (per Twilio docs):
 *  1. Start with the full URL of the request.
 *  2. Sort POST parameters alphabetically by key.
 *  3. Append each key+value pair to the URL string (no separator).
 *  4. Sign with HMAC-SHA1 using TWILIO_AUTH_TOKEN as the key.
 *  5. Compare base64-encoded digest against the X-Twilio-Signature header.
 */
export function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!signature) return false

  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token) return false

  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url)

  const expected = createHmac('sha1', token).update(sorted).digest('base64')

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false

  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}
