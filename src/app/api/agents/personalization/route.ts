import { PersonalizationAgent } from '@/lib/agents/specialists/personalization'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(PersonalizationAgent)
export const dynamic = 'force-dynamic'
