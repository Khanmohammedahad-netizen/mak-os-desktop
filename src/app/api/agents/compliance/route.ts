import { ComplianceAgent } from '@/lib/agents/specialists/compliance'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(ComplianceAgent)
export const dynamic = 'force-dynamic'
