import { OrchestratorAgent } from '@/lib/agents/specialists/orchestrator'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(OrchestratorAgent)
export const dynamic = 'force-dynamic'
