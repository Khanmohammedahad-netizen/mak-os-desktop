import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ contact_id: z.string() })
const OutputSchema = z.object({ score: z.number(), qualified: z.boolean() })

const ScoreSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string(),
})

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const QualificationAgent: Agent<Input, Output> = {
  name: 'QualificationAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const { data: contact, error } = await ctx.supabase
      .from('mak_contacts')
      .select('id, name, email, phone, country, city, website, source, category, metadata')
      .eq('id', input.contact_id)
      .single()

    if (error || !contact) throw new Error(`Contact ${input.contact_id} not found`)

    const c = contact as {
      id: string; name: string; email: string | null; phone: string | null
      country: string | null; city: string | null; website: string | null
      source: string; category: string | null
      metadata: { rating?: number; review_count?: number; linkedinUrl?: string | null } | null
    }

    const { content } = await ctx.llm({
      tier: 'medium',
      messages: [
        {
          role: 'system',
          content:
            'Score this business lead 0-100 for outreach suitability. Factors: industry fit (food/hospitality preferred), size proxies (review count, rating), reachability (phone+email present = +20pts each), GDPR risk (EU/UK without consent = -30pts). Return JSON with score and reasoning.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            name: c.name,
            category: c.category,
            country: c.country,
            city: c.city,
            hasEmail: !!c.email,
            hasPhone: !!c.phone,
            hasWebsite: !!c.website,
            rating: c.metadata?.rating,
            reviewCount: c.metadata?.review_count,
          }),
        },
      ],
      schema: ScoreSchema,
    })

    await ctx.supabase
      .from('mak_contacts')
      .update({
        metadata: { ...(c.metadata ?? {}), score: content.score, score_reasoning: content.reasoning },
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.contact_id)

    const qualified = content.score >= 60

    if (qualified) {
      if (c.email) {
        await ctx.enqueueChild('PersonalizationAgent', { contact_id: input.contact_id, channel: 'email' })
      }
      if (c.phone) {
        await ctx.enqueueChild('PersonalizationAgent', { contact_id: input.contact_id, channel: 'whatsapp' })
      }
    }

    await ctx.emit('qualified', { score: content.score, qualified, contact_id: input.contact_id })

    return { score: content.score, qualified }
  },
}
