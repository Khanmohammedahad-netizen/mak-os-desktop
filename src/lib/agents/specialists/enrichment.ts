import { z } from 'zod'
import { searchByName, getOfficers } from '@/lib/enrichment/companies-house'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ lead_id: z.string() })
const OutputSchema = z.object({ contact_id: z.string(), enriched: z.boolean() })

const UK_COUNTRIES = new Set(['uk', 'united kingdom', 'gb', 'great britain'])

const ExtractSchema = z.object({
  emails: z.array(z.string()),
  linkedinUrl: z.string().nullable(),
})

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const EnrichmentAgent: Agent<Input, Output> = {
  name: 'EnrichmentAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 60_000,

  async run(input, ctx) {
    const { data: lead, error } = await ctx.supabase
      .from('scraped_leads')
      .select('id, name, email, phone, website, country, city, source, rating, review_count')
      .eq('id', input.lead_id)
      .single()

    if (error || !lead) throw new Error(`Lead ${input.lead_id} not found`)

    const row = lead as {
      id: string; name: string; email: string | null; phone: string | null
      website: string | null; country: string | null; city: string | null
      source: string; rating: number | null; review_count: number | null
    }

    let emails: string[] = row.email ? [row.email] : []
    let linkedinUrl: string | null = null
    let officers: unknown[] = []

    if (row.website) {
      try {
        const resp = await fetch(row.website, { signal: AbortSignal.timeout(10_000) })
        const html = await resp.text()
        const { content } = await ctx.llm({
          tier: 'cheap',
          messages: [
            {
              role: 'system',
              content:
                'Extract contact info from HTML. Return JSON with emails array and linkedinUrl string or null.',
            },
            {
              role: 'user',
              content: `HTML (truncated): ${html.slice(0, 3000)}`,
            },
          ],
          schema: ExtractSchema,
        })
        if (content.emails.length > 0) emails = content.emails
        linkedinUrl = content.linkedinUrl
      } catch {
        // unreachable or LLM failed — proceed without
      }
    }

    const countryKey = (row.country ?? '').toLowerCase().trim()
    if (UK_COUNTRIES.has(countryKey) && row.name) {
      try {
        const companies = await searchByName(row.name)
        if (companies.length > 0) {
          officers = await getOfficers(companies[0].company_number)
        }
      } catch {
        // CH unavailable — proceed
      }
    }

    await ctx.supabase.from('enriched_data').insert({
      lead_id: input.lead_id,
      enrichment_source: 'EnrichmentAgent',
      data: { emails, linkedinUrl, officers },
    })

    const primaryEmail = emails[0] ?? null
    const upsertData = {
      name: row.name,
      email: primaryEmail,
      phone: row.phone,
      country: row.country,
      city: row.city,
      website: row.website,
      source: row.source,
      status: 'new',
      metadata: {
        lead_id: input.lead_id,
        linkedinUrl,
        rating: row.rating,
        review_count: row.review_count,
      },
    }

    let contactId: string

    if (primaryEmail) {
      const { data: upserted, error: upsertErr } = await ctx.supabase
        .from('mak_contacts')
        .upsert(upsertData, { onConflict: 'email' })
        .select('id')
        .single()
      if (upsertErr || !upserted) throw new Error(`Contact upsert failed: ${upsertErr?.message}`)
      contactId = (upserted as { id: string }).id
    } else {
      const { data: inserted, error: insertErr } = await ctx.supabase
        .from('mak_contacts')
        .insert(upsertData)
        .select('id')
        .single()
      if (insertErr || !inserted) throw new Error(`Contact insert failed: ${insertErr?.message}`)
      contactId = (inserted as { id: string }).id
    }

    await ctx.supabase
      .from('enriched_data')
      .update({ contact_id: contactId })
      .eq('lead_id', input.lead_id)

    await ctx.enqueueChild('QualificationAgent', { contact_id: contactId })

    return { contact_id: contactId, enriched: true }
  },
}
