import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({})
const OutputSchema = z.object({ alerts: z.number().int(), sources_checked: z.number().int() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const SourceHealthAgent: Agent<Input, Output> = {
  name: 'SourceHealthAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(_input: Input, ctx) {
    const today = new Date().toISOString().slice(0, 10)

    const { data: rows } = await ctx.supabase
      .from('source_health')
      .select('source, requests_made, requests_failed, daily_quota')
      .eq('date', today)

    const sources = (rows ?? []) as Array<{
      source: string; requests_made: number; requests_failed: number; daily_quota: number | null
    }>

    let alerts = 0

    for (const s of sources) {
      const failureRate = s.requests_made > 0 ? s.requests_failed / s.requests_made : 0
      const quotaHit = s.daily_quota != null && s.requests_made >= s.daily_quota

      if (failureRate > 0.5 || quotaHit) {
        alerts++
        await ctx.supabase.from('agent_runs').insert({
          agent: 'SourceHealthAgent',
          event: 'alert',
          data: {
            source: s.source,
            failure_rate: failureRate,
            quota_hit: quotaHit,
            requests_made: s.requests_made,
            requests_failed: s.requests_failed,
          },
        })
      }
    }

    return { alerts, sources_checked: sources.length }
  },
}
