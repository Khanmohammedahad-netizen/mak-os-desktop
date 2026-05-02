import { z } from 'zod'
import { sendWhatsAppTemplate } from '@/lib/channels/twilio'
import { gateOutbound, ComplianceError } from '@/lib/channels/compliance'
import { normalizePhone } from '@/lib/channels/normalize-phone'
import type { Agent } from '@/lib/agents/base'
import type { ContactForGate } from '@/lib/channels/compliance'

const InputSchema = z.object({
  contact_id: z.string(),
  personalization_id: z.string(),
})

const OutputSchema = z.object({ sent: z.boolean(), reason: z.string().optional() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const WhatsAppAgent: Agent<Input, Output> = {
  name: 'WhatsAppAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const [contactRes, personRes] = await Promise.all([
      ctx.supabase
        .from('mak_contacts')
        .select('id, email, phone, country, city, marketing_consent, name')
        .eq('id', input.contact_id)
        .single(),
      ctx.supabase
        .from('personalizations')
        .select('whatsapp_vars')
        .eq('id', input.personalization_id)
        .single(),
    ])

    if (contactRes.error || !contactRes.data) throw new Error(`Contact not found: ${input.contact_id}`)

    const contact = contactRes.data as ContactForGate & { name: string; city: string | null }
    const person = personRes.data as { whatsapp_vars: Record<string, string> | null } | null

    if (!contact.phone) return { sent: false, reason: 'no_phone' }

    const e164 = normalizePhone(contact.phone, contact.city ?? '', contact.country ?? '')
    if (!e164) return { sent: false, reason: 'invalid_phone' }

    try {
      await gateOutbound({ contact: { ...contact, phone: e164 }, channel: 'whatsapp' })
    } catch (err) {
      if (err instanceof ComplianceError) {
        await ctx.emit('compliance_blocked', { code: err.code, contact_id: input.contact_id })
        return { sent: false, reason: err.code }
      }
      throw err
    }

    const result = await sendWhatsAppTemplate({
      to: e164,
      contactId: input.contact_id,
      businessName: contact.name,
      city: contact.city ?? '',
    })

    if (!result.ok) {
      await ctx.emit('whatsapp_failed', { errorCode: result.errorCode, contact_id: input.contact_id })
      return { sent: false, reason: `twilio_${result.errorCode}` }
    }

    await ctx.emit('whatsapp_sent', { sid: result.sid, contact_id: input.contact_id })
    return { sent: true }
  },
}
