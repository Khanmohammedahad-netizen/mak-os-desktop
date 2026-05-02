import { ResearchAgent } from '@/lib/agents/specialists/research'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(ResearchAgent)
export const dynamic = 'force-dynamic'
