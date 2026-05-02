import { QualificationAgent } from '@/lib/agents/specialists/qualification'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(QualificationAgent)
export const dynamic = 'force-dynamic'
