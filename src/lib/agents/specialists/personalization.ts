import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({
  contact_id: z.string(),
  channel: z.enum(['email', 'whatsapp', 'call']),
})

const OutputSchema = z.object({ personalization_id: z.string() })

const PersonalizationSchema = z.object({
  whatsappVars: z.record(z.string(), z.string()).nullable(),
  emailSubject: z.string().nullable(),
  emailHtml: z.string().nullable(),
  callOpener: z.string().nullable(),
})

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const PersonalizationAgent: Agent<Input, Output> = {
  name: 'PersonalizationAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 60_000,

  async run(input, ctx) {
    const { data: contact, error } = await ctx.supabase
      .from('mak_contacts')
      .select('id, name, email, phone, country, city, category, metadata')
      .eq('id', input.contact_id)
      .single()

    if (error || !contact) throw new Error(`Contact ${input.contact_id} not found`)

    const c = contact as {
      id: string; name: string; email: string | null; phone: string | null
      country: string | null; city: string | null; category: string | null
      metadata: Record<string, unknown> | null
    }

    const contextStr = JSON.stringify({
      businessName: c.name,
      category: c.category,
      city: c.city,
      country: c.country,
      score: c.metadata?.score,
    })

    const { content: cheapContent } = await ctx.llm({
      tier: 'cheap',
      messages: [
        {
          role: 'system',
          content:
            'Generate outreach personalization. Return JSON: whatsappVars (object with vars for template, keys are "1","2" etc.), callOpener (1-sentence phone opener). emailSubject and emailHtml set to null — those come separately.',
        },
        { role: 'user', content: contextStr },
      ],
      schema: PersonalizationSchema.partial(),
    })

    let emailHtml: string | null = null
    let emailSubject: string | null = null

    if (input.channel === 'email') {
      const { content: premiumContent } = await ctx.llm({
        tier: 'premium',
        messages: [
          {
            role: 'system',
            content:
              'Write a short, personalized cold outreach email (150-200 words). Professional but warm. Focus on one specific value proposition for this business type. Return JSON: emailSubject (string), emailHtml (string with basic HTML).',
          },
          { role: 'user', content: contextStr },
        ],
        schema: z.object({ emailSubject: z.string(), emailHtml: z.string() }),
      })
      emailHtml = premiumContent.emailHtml
      emailSubject = premiumContent.emailSubject
    }

    const { data: row, error: insertErr } = await ctx.supabase
      .from('personalizations')
      .upsert(
        {
          contact_id: input.contact_id,
          channel: input.channel,
          whatsapp_vars: cheapContent.whatsappVars ?? null,
          email_subject: emailSubject,
          email_html: emailHtml,
          call_opener: cheapContent.callOpener ?? null,
        },
        { onConflict: 'contact_id,channel' },
      )
      .select('id')
      .single()

    if (insertErr || !row) throw new Error(`Personalization upsert failed: ${insertErr?.message}`)

    const personalizationId = (row as { id: string }).id

    if (input.channel === 'email') {
      await ctx.enqueueChild('EmailAgent', { contact_id: input.contact_id, personalization_id: personalizationId })
    } else if (input.channel === 'whatsapp') {
      await ctx.enqueueChild('WhatsAppAgent', { contact_id: input.contact_id, personalization_id: personalizationId })
    } else if (input.channel === 'call') {
      await ctx.enqueueChild('CallAgent', { contact_id: input.contact_id, script_id: personalizationId })
    }

    return { personalization_id: personalizationId }
  },
}
