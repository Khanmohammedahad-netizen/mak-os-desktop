import { WhatsAppAgent } from '@/lib/agents/specialists/whatsapp'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(WhatsAppAgent)
export const dynamic = 'force-dynamic'
