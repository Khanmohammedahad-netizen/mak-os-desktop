import { ReplyAgent } from '@/lib/agents/specialists/reply'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(ReplyAgent)
export const dynamic = 'force-dynamic'
