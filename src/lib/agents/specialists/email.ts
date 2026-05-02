import { z } from 'zod'
import { sendEmail } from '@/lib/channels/brevo'
import { gateOutbound, ComplianceError } from '@/lib/channels/compliance'
import type { Agent } from '@/lib/agents/base'
import type { ContactForGate } from '@/lib/channels/compliance'

const InputSchema = z.object({
  contact_id: z.string(),
  personalization_id: z.string(),
})

const OutputSchema = z.object({ sent: z.boolean(), reason: z.string().optional() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const EmailAgent: Agent<Input, Output> = {
  name: 'EmailAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const [contactRes, personRes] = await Promise.all([
      ctx.supabase
        .from('mak_contacts')
        .select('id, email, phone, country, marketing_consent')
        .eq('id', input.contact_id)
        .single(),
      ctx.supabase
        .from('personalizations')
        .select('email_subject, email_html')
        .eq('id', input.personalization_id)
        .single(),
    ])

    if (contactRes.error || !contactRes.data) throw new Error(`Contact not found: ${input.contact_id}`)
    if (personRes.error || !personRes.data) throw new Error(`Personalization not found: ${input.personalization_id}`)

    const contact = contactRes.data as ContactForGate & { email: string | null }
    const person = personRes.data as { email_subject: string | null; email_html: string | null }

    if (!contact.email) return { sent: false, reason: 'no_email' }
    if (!person.email_subject || !person.email_html) return { sent: false, reason: 'no_email_content' }

    try {
      await gateOutbound({ contact, channel: 'email' })
    } catch (err) {
      if (err instanceof ComplianceError) {
        await ctx.emit('compliance_blocked', { code: err.code, contact_id: input.contact_id })
        return { sent: false, reason: err.code }
      }
      throw err
    }

    const result = await sendEmail({
      to: contact.email,
      contactId: input.contact_id,
      subject: person.email_subject,
      html: person.email_html,
    })

    if (!result.ok && result.reason === 'API_ERROR') {
      throw new Error(`Brevo API error: ${result.status}`)
    }

    await ctx.emit('email_sent', { ok: result.ok, contact_id: input.contact_id })
    return { sent: result.ok, reason: result.ok ? undefined : result.reason }
  },
}
