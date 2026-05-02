import { CRMSyncAgent } from '@/lib/agents/specialists/crm-sync'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(CRMSyncAgent)
export const dynamic = 'force-dynamic'
