import { EmailAgent } from '@/lib/agents/specialists/email'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(EmailAgent)
export const dynamic = 'force-dynamic'
