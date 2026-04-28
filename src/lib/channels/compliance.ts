import { createClient } from '@/lib/supabase-server'
import { lookupWhatsApp } from './twilio'

const EU_UK_COUNTRIES = new Set([
  'uk', 'united kingdom', 'gb', 'great britain',
  'de', 'germany', 'fr', 'france', 'nl', 'netherlands',
  'be', 'belgium', 'es', 'spain', 'it', 'italy',
  'pt', 'portugal', 'se', 'sweden', 'no', 'norway',
  'dk', 'denmark', 'fi', 'finland', 'pl', 'poland',
  'at', 'austria', 'ch', 'switzerland', 'ie', 'ireland', 'eu',
])

export type ContactForGate = {
  id: string
  phone: string
  email: string
  country: string
  marketing_consent: boolean | null
}

export class ComplianceError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'ComplianceError'
  }
}

export async function assertNotInDNC(contactId: string): Promise<void> {
  const supabase = createClient()
  const { data } = await supabase
    .from('dnc_list')
    .select('id')
    .eq('contact_id', contactId)
    .maybeSingle()
  if (data) throw new ComplianceError('DNC', `Contact ${contactId} is in DNC list`)
}

export async function assertWhatsAppRegistered(phone: string): Promise<void> {
  const registered = await lookupWhatsApp(phone)
  if (!registered) throw new ComplianceError('NOT_WHATSAPP', `${phone} is not a WhatsApp number`)
}

export async function assertWithin24hReplyWindow(contactId: string): Promise<void> {
  const supabase = createClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('outreach_logs')
    .select('id')
    .eq('contact_id', contactId)
    .eq('direction', 'inbound')
    .gte('created_at', since)
    .maybeSingle()
  if (!data) throw new ComplianceError('NO_REPLY_WINDOW', `No inbound from ${contactId} in last 24h`)
}

export async function assertGdprCompliant(contact: ContactForGate): Promise<void> {
  const countryKey = contact.country?.toLowerCase().trim() ?? ''
  if (EU_UK_COUNTRIES.has(countryKey) && contact.marketing_consent !== true) {
    throw new ComplianceError('GDPR_NO_CONSENT', `Contact ${contact.id} in EU/UK without marketing consent`)
  }
}

export async function gateOutbound({
  contact,
  channel,
  freeform = false,
}: {
  contact: ContactForGate
  channel: 'whatsapp' | 'email' | 'voice'
  freeform?: boolean
}): Promise<void> {
  await assertNotInDNC(contact.id)
  await assertGdprCompliant(contact)
  if (channel === 'whatsapp') {
    await assertWhatsAppRegistered(contact.phone)
    if (freeform) await assertWithin24hReplyWindow(contact.id)
  }
}
