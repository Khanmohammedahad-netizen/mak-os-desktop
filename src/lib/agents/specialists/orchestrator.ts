import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ goal: z.string() })
const OutputSchema = z.object({ jobs_enqueued: z.number().int(), plan: z.string() })

const PlanSchema = z.object({
  query: z.string(),
  location: z.string(),
  target: z.number().int().min(1).max(500),
  reasoning: z.string(),
})

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const OrchestratorAgent: Agent<Input, Output> = {
  name: 'OrchestratorAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const { content: plan } = await ctx.llm({
      tier: 'premium',
      messages: [
        {
          role: 'system',
          content:
            'Decompose this outreach goal into research parameters. Return JSON: query (business type to search), location (city/area), target (number of leads, max 500), reasoning (why these params).',
        },
        { role: 'user', content: input.goal },
      ],
      schema: PlanSchema,
    })

    await ctx.enqueueChild('ResearchAgent', {
      query: plan.query,
      location: plan.location,
      target: plan.target,
    })

    await ctx.emit('plan_created', {
      goal: input.goal,
      query: plan.query,
      location: plan.location,
      target: plan.target,
    })

    return { jobs_enqueued: 1, plan: plan.reasoning }
  },
}
