import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ contact_id: z.string() })
const OutputSchema = z.object({ synced: z.boolean(), fields_updated: z.array(z.string()) })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const CRMSyncAgent: Agent<Input, Output> = {
  name: 'CRMSyncAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const { data: contact, error } = await ctx.supabase
      .from('mak_contacts')
      .select('id, name, email, phone, source, country, city, metadata, status')
      .eq('id', input.contact_id)
      .single()

    if (error || !contact) throw new Error(`Contact ${input.contact_id} not found`)

    const c = contact as {
      id: string; name: string; email: string | null; phone: string | null
      source: string; country: string | null; city: string | null
      metadata: Record<string, unknown> | null; status: string
    }

    const updatedFields: string[] = []
    const updates: Record<string, unknown> = {}

    if (!c.source || c.source === 'unknown') {
      const { data: leads } = await ctx.supabase
        .from('scraped_leads')
        .select('source')
        .eq('email', c.email ?? '')
        .limit(1)
      const leadRow = (leads ?? []) as Array<{ source: string }>
      if (leadRow.length > 0) {
        updates.source = leadRow[0].source
        updatedFields.push('source')
      }
    }

    if (!c.email) {
      const { data: enriched } = await ctx.supabase
        .from('enriched_data')
        .select('data')
        .eq('contact_id', input.contact_id)
        .limit(1)
      const enrichedRow = (enriched ?? []) as Array<{ data: { emails?: string[] } }>
      if (enrichedRow.length > 0 && enrichedRow[0].data.emails?.length) {
        updates.email = enrichedRow[0].data.emails[0]
        updatedFields.push('email')
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      await ctx.supabase.from('mak_contacts').update(updates).eq('id', input.contact_id)
    }

    await ctx.supabase.from('mak_activity_log').insert({
      entity_type: 'contact',
      entity_id: input.contact_id,
      action: 'crm_sync',
      details: { fields_updated: updatedFields, source: c.source },
    })

    await ctx.emit('crm_synced', { contact_id: input.contact_id, fields_updated: updatedFields })

    return { synced: true, fields_updated: updatedFields }
  },
}
