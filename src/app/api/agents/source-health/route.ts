import { SourceHealthAgent } from '@/lib/agents/specialists/source-health'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(SourceHealthAgent)
export const dynamic = 'force-dynamic'
