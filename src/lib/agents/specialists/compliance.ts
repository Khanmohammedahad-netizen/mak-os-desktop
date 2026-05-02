import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ contact_id: z.string() })
const OutputSchema = z.object({ passed: z.boolean(), violations: z.array(z.string()) })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

const EU_UK = ['uk', 'united kingdom', 'gb', 'de', 'fr', 'nl', 'be', 'es', 'it', 'eu']

export const ComplianceAgent: Agent<Input, Output> = {
  name: 'ComplianceAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const violations: string[] = []

    const { data: dncRow } = await ctx.supabase
      .from('dnc_list')
      .select('id, reason')
      .eq('contact_id', input.contact_id)
      .maybeSingle()

    if (dncRow) {
      const { data: logs } = await ctx.supabase
        .from('outreach_logs')
        .select('id, created_at, channel')
        .eq('contact_id', input.contact_id)
        .eq('direction', 'outbound')
        .limit(5)

      const logRows = (logs ?? []) as Array<{ id: string; channel: string }>
      if (logRows.length > 0) {
        violations.push(`DNC_VIOLATION: ${logRows.length} outbound messages sent to DNC contact`)
        await ctx.emit('alert', {
          type: 'DNC_VIOLATION',
          contact_id: input.contact_id,
          log_count: logRows.length,
        })
      }
    }

    const { data: contact } = await ctx.supabase
      .from('mak_contacts')
      .select('country, marketing_consent')
      .eq('id', input.contact_id)
      .single()

    if (contact) {
      const c = contact as { country: string | null; marketing_consent: boolean | null }
      const countryKey = (c.country ?? '').toLowerCase().trim()
      if (EU_UK.includes(countryKey) && c.marketing_consent !== true) {
        const { data: outboundLogs } = await ctx.supabase
          .from('outreach_logs')
          .select('id')
          .eq('contact_id', input.contact_id)
          .eq('direction', 'outbound')
          .limit(1)
        if ((outboundLogs ?? []).length > 0) {
          violations.push(`GDPR_VIOLATION: EU/UK contact sent without consent`)
          await ctx.emit('alert', { type: 'GDPR_VIOLATION', contact_id: input.contact_id })
        }
      }
    }

    return { passed: violations.length === 0, violations }
  },
}
