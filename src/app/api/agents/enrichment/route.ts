import { EnrichmentAgent } from '@/lib/agents/specialists/enrichment'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(EnrichmentAgent)
export const dynamic = 'force-dynamic'
