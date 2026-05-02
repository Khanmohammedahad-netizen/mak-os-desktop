import { z } from 'zod'
import { sendEmail } from '@/lib/channels/brevo'
import { sendWhatsAppFreeform } from '@/lib/channels/twilio'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({
  outreach_log_id: z.string(),
  channel: z.enum(['email', 'whatsapp']),
  body: z.string(),
})

const OutputSchema = z.object({ replied: z.boolean(), contact_id: z.string() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

const MEETING_INTENT_KEYWORDS = [
  'meet', 'meeting', 'call', 'schedule', 'appointment', 'demo', 'chat', 'available',
  'book', 'time', 'calendar', 'zoom', 'interested', 'yes', 'sure', "let's talk",
]

function hasMeetingIntent(text: string): boolean {
  const lower = text.toLowerCase()
  return MEETING_INTENT_KEYWORDS.some((kw) => lower.includes(kw))
}

export const ReplyAgent: Agent<Input, Output> = {
  name: 'ReplyAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 60_000,

  async run(input, ctx) {
    const { data: log, error: logErr } = await ctx.supabase
      .from('outreach_logs')
      .select('contact_id, channel')
      .eq('id', input.outreach_log_id)
      .single()

    if (logErr || !log) throw new Error(`Outreach log ${input.outreach_log_id} not found`)

    const contactId = (log as { contact_id: string }).contact_id

    const { data: history } = await ctx.supabase
      .from('outreach_logs')
      .select('direction, body, created_at')
      .eq('contact_id', contactId)
      .eq('channel', input.channel)
      .order('created_at', { ascending: true })
      .limit(10)

    const historyStr = ((history ?? []) as Array<{ direction: string; body: string | null }>)
      .map((h) => `${h.direction}: ${h.body ?? ''}`)
      .join('\n')

    const { content: reply } = await ctx.llm({
      tier: 'premium',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful business development assistant. Write a concise, professional reply to this inbound message. Keep it under 100 words. Do not use placeholders.',
        },
        {
          role: 'user',
          content: `Conversation history:\n${historyStr}\n\nLatest inbound: ${input.body}\n\nWrite a reply:`,
        },
      ],
    })

    const { data: contact } = await ctx.supabase
      .from('mak_contacts')
      .select('id, email, phone, country, city')
      .eq('id', contactId)
      .single()

    if (!contact) throw new Error(`Contact ${contactId} not found`)

    const c = contact as { id: string; email: string | null; phone: string | null; country: string | null; city: string | null }

    if (input.channel === 'email' && c.email) {
      await sendEmail({
        to: c.email,
        contactId,
        subject: 'Re: Your message',
        html: `<p>${reply}</p>`,
      })
    } else if (input.channel === 'whatsapp' && c.phone) {
      await sendWhatsAppFreeform({ to: c.phone, contactId, body: reply })
    }

    await ctx.supabase
      .from('mak_contacts')
      .update({ status: 'responded', updated_at: new Date().toISOString() })
      .eq('id', contactId)

    if (hasMeetingIntent(input.body)) {
      await ctx.enqueueChild('SchedulerAgent', { contact_id: contactId })
    }

    await ctx.emit('reply_sent', { channel: input.channel, contact_id: contactId })

    return { replied: true, contact_id: contactId }
  },
}
