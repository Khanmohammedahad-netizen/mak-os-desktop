import { AuditAgent } from '@/lib/agents/specialists/audit'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(AuditAgent)
export const dynamic = 'force-dynamic'
