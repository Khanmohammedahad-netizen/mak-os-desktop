import { CallAgent } from '@/lib/agents/specialists/call'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(CallAgent)
export const dynamic = 'force-dynamic'
