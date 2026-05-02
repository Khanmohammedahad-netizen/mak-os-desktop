import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({})
const OutputSchema = z.object({ channels_paused: z.array(z.string()), alerts: z.number().int() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

const BOUNCE_THRESHOLD = 0.05
const SPAM_THRESHOLD = 0.005

export const DeliverabilityAgent: Agent<Input, Output> = {
  name: 'DeliverabilityAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 60_000,

  async run(_input: Input, ctx) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const channelsPaused: string[] = []
    let alerts = 0

    const { data: emailLogs } = await ctx.supabase
      .from('outreach_logs')
      .select('status')
      .eq('channel', 'email')
      .eq('direction', 'outbound')
      .gte('created_at', since)

    const emailRows = (emailLogs ?? []) as Array<{ status: string | null }>
    if (emailRows.length > 0) {
      const bounces = emailRows.filter((r) => r.status === 'hard_bounce' || r.status === 'soft_bounce').length
      const spams = emailRows.filter((r) => r.status === 'spam').length
      const bounceRate = bounces / emailRows.length
      const spamRate = spams / emailRows.length

      if (bounceRate > BOUNCE_THRESHOLD || spamRate > SPAM_THRESHOLD) {
        await ctx.supabase.from('system_state').upsert({
          key: 'channel_paused:email',
          value: { paused: true, reason: `bounce ${(bounceRate * 100).toFixed(1)}% spam ${(spamRate * 100).toFixed(1)}%`, paused_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        channelsPaused.push('email')
        alerts++
        await ctx.emit('alert', { type: 'EMAIL_DELIVERABILITY', bounce_rate: bounceRate, spam_rate: spamRate })
      }
    }

    const { data: waLogs } = await ctx.supabase
      .from('outreach_logs')
      .select('status')
      .eq('channel', 'whatsapp')
      .eq('direction', 'outbound')
      .gte('created_at', since)

    const waRows = (waLogs ?? []) as Array<{ status: string | null }>
    if (waRows.length > 0) {
      const waFailed = waRows.filter((r) => r.status === 'failed').length
      const waFailRate = waFailed / waRows.length
      if (waFailRate > BOUNCE_THRESHOLD) {
        await ctx.supabase.from('system_state').upsert({
          key: 'channel_paused:whatsapp',
          value: { paused: true, reason: `fail_rate ${(waFailRate * 100).toFixed(1)}%`, paused_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        channelsPaused.push('whatsapp')
        alerts++
        await ctx.emit('alert', { type: 'WHATSAPP_DELIVERABILITY', fail_rate: waFailRate })
      }
    }

    return { channels_paused: channelsPaused, alerts }
  },
}
