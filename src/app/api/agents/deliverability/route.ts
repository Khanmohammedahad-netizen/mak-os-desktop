import { DeliverabilityAgent } from '@/lib/agents/specialists/deliverability'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(DeliverabilityAgent)
export const dynamic = 'force-dynamic'
