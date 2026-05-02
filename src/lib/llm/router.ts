import { z, ZodSchema } from 'zod'

export type LLMTier = 'cheap' | 'medium' | 'premium'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResult<T = string> {
  content: T
  cost_cents: number
}

interface TierConfig {
  url: string
  model: string
  apiKeyEnv: string
}

const TIERS: Record<LLMTier, TierConfig> = {
  cheap: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
  },
  medium: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'anthropic/claude-haiku-4-5-20251001',
    apiKeyEnv: 'OPENROUTER_API_KEY',
  },
  premium: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'anthropic/claude-sonnet-4-6',
    apiKeyEnv: 'OPENROUTER_API_KEY',
  },
}

const TIER_ORDER: LLMTier[] = ['cheap', 'medium', 'premium']

async function callTier(
  config: TierConfig,
  messages: LLMMessage[],
): Promise<{ content: string; cost_cents: number }> {
  const apiKey = process.env[config.apiKeyEnv] ?? ''
  const res = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: config.model, messages }),
  })

  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`)
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }

  const content = json.choices?.[0]?.message?.content ?? ''
  const promptTokens = json.usage?.prompt_tokens ?? 0
  const completionTokens = json.usage?.completion_tokens ?? 0
  const cost_cents = promptTokens * 0.0001 + completionTokens * 0.0003

  return { content, cost_cents }
}

export async function callLLM<T = string>(opts: {
  tier: LLMTier
  messages: LLMMessage[]
  schema?: ZodSchema<T>
}): Promise<LLMResult<T>> {
  const { tier, messages, schema } = opts
  const startIndex = TIER_ORDER.indexOf(tier)

  const msgs: LLMMessage[] = schema
    ? [...messages, { role: 'user', content: 'Respond with valid JSON only. No markdown, no explanation.' }]
    : messages

  for (let i = startIndex; i < TIER_ORDER.length; i++) {
    const currentTier = TIER_ORDER[i]
    const config = TIERS[currentTier]

    try {
      const { content, cost_cents } = await callTier(config, msgs)

      if (schema) {
        try {
          const parsed = schema.parse(JSON.parse(content))
          return { content: parsed as T, cost_cents }
        } catch {
          if (i === TIER_ORDER.length - 1) {
            throw new Error(`Schema validation failed on all tiers. Last response: ${content}`)
          }
          console.warn(`[LLM] Schema parse failed on ${currentTier}, escalating to ${TIER_ORDER[i + 1]}`)
          continue
        }
      }

      return { content: content as T, cost_cents }
    } catch (err) {
      if (i === TIER_ORDER.length - 1) throw err
      console.warn(
        `[LLM] ${currentTier} failed (${(err as Error).message}), escalating to ${TIER_ORDER[i + 1]}`,
      )
    }
  }

  throw new Error('All LLM tiers exhausted')
}
