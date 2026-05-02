import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeGroqResponse(content: string, promptTokens = 100, completionTokens = 50) {
  return {
    ok: true,
    text: async () => '',
    json: async () => ({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens },
    }),
  }
}

describe('callLLM', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GROQ_API_KEY = 'test-groq-key'
    process.env.OPENROUTER_API_KEY = 'test-or-key'
  })

  it('calls Groq for cheap tier and returns content + cost', async () => {
    mockFetch.mockResolvedValueOnce(makeGroqResponse('hello world'))
    const { callLLM } = await import('../router')
    const result = await callLLM({ tier: 'cheap', messages: [{ role: 'user', content: 'hi' }] })
    expect(result.content).toBe('hello world')
    expect(result.cost_cents).toBeGreaterThanOrEqual(0)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('groq.com')
    expect(JSON.parse(init.body).model).toBe('llama-3.3-70b-versatile')
  })

  it('calls OpenRouter for medium tier', async () => {
    mockFetch.mockResolvedValueOnce(makeGroqResponse('medium response'))
    const { callLLM } = await import('../router')
    const result = await callLLM({ tier: 'medium', messages: [{ role: 'user', content: 'hi' }] })
    expect(result.content).toBe('medium response')
    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('openrouter.ai')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.model).toContain('claude-haiku')
  })

  it('calls OpenRouter with Sonnet for premium tier', async () => {
    mockFetch.mockResolvedValueOnce(makeGroqResponse('premium response'))
    const { callLLM } = await import('../router')
    await callLLM({ tier: 'premium', messages: [{ role: 'user', content: 'hi' }] })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.model).toContain('claude-sonnet')
  })

  it('escalates cheap→medium on HTTP error', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, text: async () => 'rate limit' })
      .mockResolvedValueOnce(makeGroqResponse('fallback'))
    const { callLLM } = await import('../router')
    const result = await callLLM({ tier: 'cheap', messages: [{ role: 'user', content: 'hi' }] })
    expect(result.content).toBe('fallback')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[1][0]).toContain('openrouter.ai')
  })

  it('parses and validates JSON schema when schema provided', async () => {
    const { z } = await import('zod')
    mockFetch.mockResolvedValueOnce(makeGroqResponse('{"score":75,"reason":"good"}'))
    const { callLLM } = await import('../router')
    const schema = z.object({ score: z.number(), reason: z.string() })
    const result = await callLLM({ tier: 'cheap', messages: [{ role: 'user', content: 'score' }], schema })
    expect(result.content).toEqual({ score: 75, reason: 'good' })
  })

  it('escalates on schema parse failure then succeeds', async () => {
    const { z } = await import('zod')
    mockFetch
      .mockResolvedValueOnce(makeGroqResponse('not json at all'))
      .mockResolvedValueOnce(makeGroqResponse('{"score":80,"reason":"ok"}'))
    const { callLLM } = await import('../router')
    const schema = z.object({ score: z.number(), reason: z.string() })
    const result = await callLLM({ tier: 'cheap', messages: [], schema })
    expect((result.content as { score: number }).score).toBe(80)
  })

  it('throws when all tiers fail', async () => {
    mockFetch.mockResolvedValue({ ok: false, text: async () => 'error' })
    const { callLLM } = await import('../router')
    await expect(callLLM({ tier: 'cheap', messages: [] })).rejects.toThrow()
  })
})
