import { describe, expect, it, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// Mock supabaseAdmin
const mockSupabaseAdmin = {
  from: vi.fn(),
}

mockSupabaseAdmin.from.mockImplementation(() => ({
  insert: vi.fn().mockResolvedValue({ data: { id: 'run-1' }, error: null }),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ error: null }),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 'job-child-1' }, error: null }),
}))

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  createClient: () => mockSupabaseAdmin,
}))

vi.mock('@/lib/llm/router', () => ({
  callLLM: vi.fn().mockResolvedValue({ content: 'ok', cost_cents: 0.1 }),
}))

const InputSchema = z.object({ value: z.string() })
const OutputSchema = z.object({ result: z.string() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

describe('runAgent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marks job dead immediately on input schema failure', async () => {
    const { runAgent } = await import('../base')

    const agent = {
      name: 'TestAgent',
      inputSchema: InputSchema,
      outputSchema: OutputSchema,
      maxRuntimeMs: 5000,
      run: vi.fn(),
    }

    const job = { id: 'job-1', payload: { wrong: 'field' }, attempts: 0, max_attempts: 3 }
    const result = await runAgent(agent, job)

    expect(result.status).toBe('failed')
    expect(agent.run).not.toHaveBeenCalled()
  })

  it('runs agent, validates output, sets done', async () => {
    const { runAgent } = await import('../base')

    const agent = {
      name: 'TestAgent',
      inputSchema: InputSchema,
      outputSchema: OutputSchema,
      maxRuntimeMs: 5000,
      run: vi.fn().mockResolvedValue({ result: 'success' }),
    }

    const job = { id: 'job-2', payload: { value: 'hello' }, attempts: 0, max_attempts: 3 }
    const result = await runAgent(agent, job)

    expect(result.status).toBe('done')
    expect(agent.run).toHaveBeenCalledOnce()
  })

  it('retries on thrown error when attempts < max_attempts', async () => {
    const { runAgent } = await import('../base')

    const agent = {
      name: 'TestAgent',
      inputSchema: InputSchema,
      outputSchema: OutputSchema,
      maxRuntimeMs: 5000,
      run: vi.fn().mockRejectedValue(new Error('network error')),
    }

    const job = { id: 'job-3', payload: { value: 'hello' }, attempts: 0, max_attempts: 3 }
    const result = await runAgent(agent, job)

    expect(result.status).toBe('retry')
  })

  it('marks failed when attempts >= max_attempts', async () => {
    const { runAgent } = await import('../base')

    const agent = {
      name: 'TestAgent',
      inputSchema: InputSchema,
      outputSchema: OutputSchema,
      maxRuntimeMs: 5000,
      run: vi.fn().mockRejectedValue(new Error('permanent error')),
    }

    const job = { id: 'job-4', payload: { value: 'hello' }, attempts: 2, max_attempts: 3 }
    const result = await runAgent(agent, job)

    expect(result.status).toBe('failed')
  })

  it('times out and retries', async () => {
    vi.useFakeTimers()
    const { runAgent } = await import('../base')

    const agent = {
      name: 'TestAgent',
      inputSchema: InputSchema,
      outputSchema: OutputSchema,
      maxRuntimeMs: 100,
      run: vi.fn().mockImplementation(() => new Promise(() => {})), // never resolves
    }

    const job = { id: 'job-5', payload: { value: 'hello' }, attempts: 0, max_attempts: 3 }
    const resultPromise = runAgent(agent, job)
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.status).toBe('retry')
    vi.useRealTimers()
  })
})
