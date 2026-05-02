import { ZodSchema } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { callLLM } from '@/lib/llm/router'

export class AgentTimeoutError extends Error {
  constructor(agentName: string, ms: number) {
    super(`Agent ${agentName} timed out after ${ms}ms`)
    this.name = 'AgentTimeoutError'
  }
}

export interface AgentContext {
  jobId: string
  emit(event: string, data: unknown): Promise<void>
  enqueueChild(agent: string, payload: unknown, runAt?: Date): Promise<string>
  llm: typeof callLLM
  supabase: typeof supabaseAdmin
}

export interface Agent<I, O> {
  name: string
  inputSchema: ZodSchema<I>
  outputSchema: ZodSchema<O>
  maxRuntimeMs: number
  run(input: I, ctx: AgentContext): Promise<O>
}

export async function runAgent<I, O>(
  agent: Agent<I, O>,
  jobRow: { id: string; payload: unknown; attempts: number; max_attempts: number },
): Promise<{ status: string; result?: O; error?: string }> {
  const startTime = Date.now()
  let totalCostCents = 0

  const ctx: AgentContext = {
    jobId: jobRow.id,

    async emit(event, data) {
      await supabaseAdmin.from('agent_runs').insert({
        job_id: jobRow.id,
        agent: agent.name,
        event,
        data: data as Record<string, unknown>,
      })
    },

    async enqueueChild(agentName, payload, runAt?) {
      const { data, error } = await supabaseAdmin
        .from('agent_jobs')
        .insert({
          agent: agentName,
          payload,
          parent_job_id: jobRow.id,
          run_at: (runAt ?? new Date()).toISOString(),
          status: 'pending',
        })
        .select('id')
        .single()
      if (error) throw new Error(`enqueueChild failed: ${error.message}`)
      return (data as { id: string }).id
    },

    llm: async (opts) => {
      const result = await callLLM(opts)
      totalCostCents += result.cost_cents
      return result
    },

    supabase: supabaseAdmin,
  }

  // Validate input — permanent failure on bad schema
  const inputParsed = agent.inputSchema.safeParse(jobRow.payload)
  if (!inputParsed.success) {
    const error = inputParsed.error.message
    await supabaseAdmin
      .from('agent_jobs')
      .update({ status: 'failed', error, updated_at: new Date().toISOString() })
      .eq('id', jobRow.id)
    await ctx.emit('failed', { reason: 'invalid_input', error })
    return { status: 'failed', error }
  }

  // Mark running
  await supabaseAdmin
    .from('agent_jobs')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('id', jobRow.id)

  await ctx.emit('started', { attempt: jobRow.attempts + 1 })

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new AgentTimeoutError(agent.name, agent.maxRuntimeMs)),
      agent.maxRuntimeMs,
    )
  })

  try {
    const output = await Promise.race([agent.run(inputParsed.data, ctx), timeoutPromise])

    if (timeoutHandle) clearTimeout(timeoutHandle)

    const outputParsed = agent.outputSchema.safeParse(output)
    if (!outputParsed.success) {
      throw new Error(`Output schema invalid: ${outputParsed.error.message}`)
    }

    const duration = Date.now() - startTime

    await supabaseAdmin
      .from('agent_jobs')
      .update({
        status: 'done',
        result: output as Record<string, unknown>,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobRow.id)

    await supabaseAdmin.from('agent_runs').insert({
      job_id: jobRow.id,
      agent: agent.name,
      event: 'completed',
      data: { output },
      cost_cents: totalCostCents,
      duration_ms: duration,
    })

    return { status: 'done', result: outputParsed.data }
  } catch (err) {
    if (timeoutHandle) clearTimeout(timeoutHandle)

    const error = (err as Error).message
    const duration = Date.now() - startTime
    const newAttempts = jobRow.attempts + 1
    const isPermanent = newAttempts >= jobRow.max_attempts

    const backoffMs = Math.pow(2, newAttempts) * 30_000
    const nextRunAt = new Date(Date.now() + backoffMs).toISOString()

    await supabaseAdmin
      .from('agent_jobs')
      .update(
        isPermanent
          ? { status: 'failed', attempts: newAttempts, error, locked_until: null, updated_at: new Date().toISOString() }
          : { status: 'pending', attempts: newAttempts, error, run_at: nextRunAt, locked_until: null, updated_at: new Date().toISOString() },
      )
      .eq('id', jobRow.id)

    await supabaseAdmin.from('agent_runs').insert({
      job_id: jobRow.id,
      agent: agent.name,
      event: 'error',
      data: { error },
      cost_cents: totalCostCents,
      duration_ms: duration,
    })

    return { status: isPermanent ? 'failed' : 'retry', error }
  }
}
