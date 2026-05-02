import { z } from 'zod'
import { triggerCall, ChannelDisabledError } from '@/lib/channels/bland'
import { gateOutbound, ComplianceError } from '@/lib/channels/compliance'
import type { Agent } from '@/lib/agents/base'
import type { ContactForGate } from '@/lib/channels/compliance'

const InputSchema = z.object({
  contact_id: z.string(),
  script_id: z.string(),
})

const OutputSchema = z.object({ sent: z.boolean(), reason: z.string().optional() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const CallAgent: Agent<Input, Output> = {
  name: 'CallAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    if (!process.env.BLAND_API_KEY) {
      await ctx.emit('voice_disabled', { contact_id: input.contact_id, reason: 'BLAND_API_KEY not configured' })
      return { sent: false, reason: 'voice_disabled' }
    }

    const { data: contact, error } = await ctx.supabase
      .from('mak_contacts')
      .select('id, email, phone, country, marketing_consent')
      .eq('id', input.contact_id)
      .single()

    if (error || !contact) throw new Error(`Contact not found: ${input.contact_id}`)

    const c = contact as ContactForGate

    try {
      await gateOutbound({ contact: c, channel: 'voice' })
    } catch (err) {
      if (err instanceof ComplianceError) {
        await ctx.emit('compliance_blocked', { code: err.code })
        return { sent: false, reason: err.code }
      }
      throw err
    }

    try {
      const result = await triggerCall({
        to: c.phone,
        contactId: input.contact_id,
        scriptOrPathway: input.script_id,
        leadContext: { contactId: input.contact_id },
      })
      await ctx.emit('call_triggered', { ok: result.ok })
      return { sent: result.ok, reason: result.ok ? undefined : result.errorMessage }
    } catch (err) {
      if (err instanceof ChannelDisabledError) {
        return { sent: false, reason: 'voice_disabled' }
      }
      throw err
    }
  },
}
