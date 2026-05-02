import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({
  contact_id: z.string(),
  target_company: z.string(),
})

const OutputSchema = z.object({ report_id: z.string(), tokens_used: z.number() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const AuditAgent: Agent<Input, Output> = {
  name: 'AuditAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 120_000,

  async run(input, ctx) {
    const { data: contact } = await ctx.supabase
      .from('mak_contacts')
      .select('name, category, city, country, website, metadata')
      .eq('id', input.contact_id)
      .single()

    const c = (contact ?? {}) as {
      name: string; category: string | null; city: string | null
      country: string | null; website: string | null; metadata: Record<string, unknown> | null
    }

    const { content, cost_cents } = await ctx.llm({
      tier: 'premium',
      messages: [
        {
          role: 'system',
          content: `You are a business analyst. Write a concise free business audit report (~3000 tokens) for the following business. Cover:
1. Online presence assessment
2. Key opportunities for improvement
3. Competitive positioning
4. 3 actionable recommendations
5. Summary verdict

Be specific and actionable. This will be shared as a value-add with the business owner.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            companyName: input.target_company,
            category: c.category,
            city: c.city,
            country: c.country,
            website: c.website,
            rating: c.metadata?.rating,
            reviewCount: c.metadata?.review_count,
          }),
        },
      ],
    })

    const approxTokens = Math.round(cost_cents / 0.0003)

    const { data: report, error } = await ctx.supabase
      .from('audit_reports')
      .insert({
        contact_id: input.contact_id,
        target_company: input.target_company,
        report_text: content as string,
        tokens_used: approxTokens,
      })
      .select('id')
      .single()

    if (error || !report) throw new Error(`Audit report insert failed: ${error?.message}`)

    await ctx.emit('audit_complete', { report_id: (report as { id: string }).id, tokens: approxTokens })

    return { report_id: (report as { id: string }).id, tokens_used: approxTokens }
  },
}
