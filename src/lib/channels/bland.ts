// src/lib/channels/bland.ts
export class ChannelDisabledError extends Error {
  constructor() {
    super('CHANNEL_DISABLED: BLAND_API_KEY not configured')
    this.name = 'ChannelDisabledError'
  }
}

export async function triggerCall(_args: {
  to: string
  contactId: string
  scriptOrPathway: string
  leadContext: Record<string, unknown>
}): Promise<never> {
  throw new ChannelDisabledError()
}
