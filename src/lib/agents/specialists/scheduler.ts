import { z } from 'zod'
import { sendEmail } from '@/lib/channels/brevo'
import { sendWhatsAppFreeform } from '@/lib/channels/twilio'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ contact_id: z.string() })
const OutputSchema = z.object({ scheduled: z.boolean() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

const BOOKING_URL = process.env.CAL_COM_URL ?? 'https://cal.com/mak-os/intro'

export const SchedulerAgent: Agent<Input, Output> = {
  name: 'SchedulerAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const { data: contact, error } = await ctx.supabase
      .from('mak_contacts')
      .select('id, name, email, phone, country, city')
      .eq('id', input.contact_id)
      .single()

    if (error || !contact) throw new Error(`Contact ${input.contact_id} not found`)

    const c = contact as { id: string; name: string; email: string | null; phone: string | null; country: string | null; city: string | null }

    const message = `Hi ${c.name}, thanks for your interest! You can book a quick 15-minute intro call here: ${BOOKING_URL}`

    if (c.email) {
      await sendEmail({
        to: c.email,
        contactId: input.contact_id,
        subject: 'Book a quick call',
        html: `<p>${message}</p>`,
      })
    } else if (c.phone) {
      await sendWhatsAppFreeform({ to: c.phone, contactId: input.contact_id, body: message })
    }

    const nextFollowUp = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    await ctx.supabase
      .from('mak_contacts')
      .update({ next_follow_up_at: nextFollowUp, updated_at: new Date().toISOString() })
      .eq('id', input.contact_id)

    await ctx.emit('booking_link_sent', { contact_id: input.contact_id, url: BOOKING_URL })

    return { scheduled: true }
  },
}
