import { SchedulerAgent } from '@/lib/agents/specialists/scheduler'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(SchedulerAgent)
export const dynamic = 'force-dynamic'
