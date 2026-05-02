import { z } from 'zod'
import { scrapeLeads } from '@/lib/scrapers/orchestrator'
import type { Agent, AgentContext } from '@/lib/agents/base'

const InputSchema = z.object({
  query: z.string(),
  location: z.string(),
  target: z.number().int().default(50),
})

const OutputSchema = z.object({
  leads_found: z.number().int(),
  jobs_enqueued: z.number().int(),
})

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const ResearchAgent: Agent<Input, Output> = {
  name: 'ResearchAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 120_000,

  async run(input, ctx: AgentContext) {
    const { leads } = await scrapeLeads(input.query, input.location, input.target)

    const externalIds = leads.map((l) => l.external_id)
    const { data: leadRows } = await ctx.supabase
      .from('scraped_leads')
      .select('id, external_id')
      .in('external_id', externalIds)

    const rows = (leadRows ?? []) as Array<{ id: string; external_id: string }>

    let jobsEnqueued = 0
    for (const row of rows) {
      await ctx.enqueueChild('EnrichmentAgent', { lead_id: row.id })
      jobsEnqueued++
    }

    await ctx.emit('research_complete', {
      leads_found: leads.length,
      location: input.location,
      jobs_enqueued: jobsEnqueued,
    })

    return { leads_found: leads.length, jobs_enqueued: jobsEnqueued }
  },
}
