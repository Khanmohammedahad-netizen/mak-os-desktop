# Phase C — 15-Agent Outreach Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full autonomous outreach runtime: LLM router, BaseAgent framework, 15 specialist agents, job-drain cron, and a deterministic E2E pipeline test.

**Architecture:** HTTP-dispatch on Vercel serverless. Agents are Next.js route handlers. A cron-driven drain-jobs route locks and fires fetch() to each agent route. Agents use direct imports (no self-HTTP) for channels and scrapers. `runAgent()` wrapper handles locking, retries, timeout, cost tracking.

**Tech Stack:** Next.js 16 App Router, Zod 4, Supabase (supabaseAdmin service role), Groq REST API (llama-3.3-70b, free tier), OpenRouter REST API (Claude Haiku medium, Claude Sonnet premium), Vitest 4.

---

## ⚠️ PRECONDITIONS — Check Before Starting

1. `GROQ_API_KEY` — **ask the user for this value now before implementing Task 2**. Sign up free at console.groq.com (no card required).
2. `OPENROUTER_API_KEY` — already in Vercel from Phase B.
3. All Phase B env vars present: `TWILIO_*`, `BREVO_*`, `BLAND_API_KEY` (or absent for stub).
4. Supabase admin accessible: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set.
5. Migrations 0001–0003 applied to Supabase.

---

## File Map

| File | Responsibility |
|------|---------------|
| `supabase/migrations/0004_agents.sql` | `personalizations`, `audit_reports`, `system_state` tables |
| `supabase/migrations/0005_contacts_phase_c.sql` | Add `metadata` to `mak_contacts`, email unique index |
| `src/lib/llm/router.ts` | Three-tier LLM router with fallback and cost tracking |
| `src/lib/llm/__tests__/router.test.ts` | Unit tests for router |
| `src/lib/agents/base.ts` | `Agent<I,O>` interface, `AgentContext`, `runAgent()` wrapper |
| `src/lib/agents/create-route.ts` | Shared Next.js route factory used by all 15 agent routes |
| `src/lib/agents/__tests__/base.test.ts` | Unit tests for runAgent |
| `src/lib/agents/specialists/research.ts` | ResearchAgent — scrape leads, enqueue enrichment |
| `src/lib/agents/specialists/enrichment.ts` | EnrichmentAgent — homepage extract, Companies House, upsert contact |
| `src/lib/agents/specialists/qualification.ts` | QualificationAgent — LLM score 0–100, gate at 60 |
| `src/lib/agents/specialists/personalization.ts` | PersonalizationAgent — generate channel content, write personalizations |
| `src/lib/agents/specialists/email.ts` | EmailAgent — compliance + Brevo send |
| `src/lib/agents/specialists/whatsapp.ts` | WhatsAppAgent — compliance + Twilio WA send |
| `src/lib/agents/specialists/call.ts` | CallAgent — Bland.ai or no-op |
| `src/lib/agents/specialists/reply.ts` | ReplyAgent — LLM reply to inbound, set responded |
| `src/lib/agents/specialists/scheduler.ts` | SchedulerAgent — detect meeting intent, send booking link |
| `src/lib/agents/specialists/crm-sync.ts` | CRMSyncAgent — cross-check leads↔contacts, write activity log |
| `src/lib/agents/specialists/audit.ts` | AuditAgent — premium LLM audit report |
| `src/lib/agents/specialists/source-health.ts` | SourceHealthAgent — monitor scraper health, alert |
| `src/lib/agents/specialists/compliance.ts` | ComplianceAgent — standalone DNC audit |
| `src/lib/agents/specialists/deliverability.ts` | DeliverabilityAgent — 7d bounce/spam, pause channel |
| `src/lib/agents/specialists/orchestrator.ts` | OrchestratorAgent — LLM goal decompose, enqueue research |
| `src/app/api/agents/*/route.ts` | 15 agent route handlers (one per agent, all use createAgentRoute) |
| `src/app/api/orchestrator/route.ts` | Entry point — enqueue OrchestratorAgent job |
| `src/app/api/cron/drain-jobs/route.ts` | Lock ≤20 pending jobs, fire-and-forget to agent routes |
| `src/__tests__/e2e/full-pipeline.spec.ts` | Deterministic E2E test, mocked services |
| `vitest.e2e.config.ts` | Vitest config for e2e project |

---

## Task 1: DB Migrations

**Files:**
- Create: `supabase/migrations/0004_agents.sql`
- Create: `supabase/migrations/0005_contacts_phase_c.sql`

- [ ] **Step 1.1: Write 0004_agents.sql**

```sql
-- supabase/migrations/0004_agents.sql

CREATE TABLE IF NOT EXISTS personalizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES mak_contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  whatsapp_vars JSONB,
  email_subject TEXT,
  email_html TEXT,
  call_opener TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, channel)
);

CREATE TABLE IF NOT EXISTS audit_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES mak_contacts(id) ON DELETE CASCADE,
  target_company TEXT NOT NULL,
  report_text TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE personalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_all_personalizations ON personalizations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_audit_reports ON audit_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_system_state ON system_state FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 1.2: Write 0005_contacts_phase_c.sql**

```sql
-- supabase/migrations/0005_contacts_phase_c.sql

-- metadata JSONB stores agent-computed data (score, linkedin, etc.)
ALTER TABLE mak_contacts ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Unique index on email for upsert conflict resolution in EnrichmentAgent
-- Partial index: only rows where email IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_mak_contacts_email
  ON mak_contacts(email)
  WHERE email IS NOT NULL;
```

- [ ] **Step 1.3: Apply both migrations**

```bash
npx supabase db push
```

Expected: `0004_agents` and `0005_contacts_phase_c` applied, no errors.

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/0004_agents.sql supabase/migrations/0005_contacts_phase_c.sql
git commit -m "feat(db): personalizations, audit_reports, system_state, contacts metadata"
```

---

## Task 2: LLM Router

**Files:**
- Create: `src/lib/llm/router.ts`
- Create: `src/lib/llm/__tests__/router.test.ts`

> ⚠️ **Before coding: ask the user for GROQ_API_KEY** and add it to `.env.local` and Vercel project settings.

- [ ] **Step 2.1: Write failing tests**

```typescript
// src/lib/llm/__tests__/router.test.ts
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
```

- [ ] **Step 2.2: Run tests — confirm fail**

```bash
npx vitest run src/lib/llm/__tests__/router.test.ts
```

Expected: `Cannot find module '../router'`

- [ ] **Step 2.3: Implement router.ts**

```typescript
// src/lib/llm/router.ts
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
```

- [ ] **Step 2.4: Run tests — confirm pass**

```bash
npx vitest run src/lib/llm/__tests__/router.test.ts
```

Expected: all 7 tests green.

- [ ] **Step 2.5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2.6: Commit**

```bash
git add src/lib/llm/
git commit -m "feat(llm): three-tier router — Groq cheap, OpenRouter medium/premium, fallback escalation"
```

---

## Task 3: BaseAgent Framework + Route Helper

**Files:**
- Create: `src/lib/agents/base.ts`
- Create: `src/lib/agents/create-route.ts`
- Create: `src/lib/agents/__tests__/base.test.ts`

- [ ] **Step 3.1: Write failing tests**

```typescript
// src/lib/agents/__tests__/base.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// Mock supabaseAdmin
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockSelect = vi.fn().mockReturnThis()
const mockSingle = vi.fn()

const mockSupabaseAdmin = {
  from: vi.fn().mockReturnValue({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
  }),
}

// Each .from() call returns a fresh builder to allow chaining
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
    vi.runAllTimers()
    const result = await resultPromise

    expect(result.status).toBe('retry')
    vi.useRealTimers()
  })
})
```

- [ ] **Step 3.2: Run tests — confirm fail**

```bash
npx vitest run src/lib/agents/__tests__/base.test.ts
```

Expected: `Cannot find module '../base'`

- [ ] **Step 3.3: Implement base.ts**

```typescript
// src/lib/agents/base.ts
import { ZodSchema } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { callLLM } from '@/lib/llm/router'

export class AgentTimeoutError extends Error {
  constructor(agentName: string, ms: number) {
    super(`Agent ${agentName} timed out after ${ms}ms`)
    this.name = 'AgentTimeoutError'
  }
}

export interface AgentContext {
  jobId: string
  emit(event: string, data: unknown): Promise<void>
  enqueueChild(agent: string, payload: unknown, runAt?: Date): Promise<string>
  llm: typeof callLLM
  supabase: typeof supabaseAdmin
}

export interface Agent<I, O> {
  name: string
  inputSchema: ZodSchema<I>
  outputSchema: ZodSchema<O>
  maxRuntimeMs: number
  run(input: I, ctx: AgentContext): Promise<O>
}

export async function runAgent<I, O>(
  agent: Agent<I, O>,
  jobRow: { id: string; payload: unknown; attempts: number; max_attempts: number },
): Promise<{ status: string; result?: O; error?: string }> {
  const startTime = Date.now()
  let totalCostCents = 0

  const ctx: AgentContext = {
    jobId: jobRow.id,

    async emit(event, data) {
      await supabaseAdmin.from('agent_runs').insert({
        job_id: jobRow.id,
        agent: agent.name,
        event,
        data: data as Record<string, unknown>,
      })
    },

    async enqueueChild(agentName, payload, runAt?) {
      const { data, error } = await supabaseAdmin
        .from('agent_jobs')
        .insert({
          agent: agentName,
          payload,
          parent_job_id: jobRow.id,
          run_at: (runAt ?? new Date()).toISOString(),
          status: 'pending',
        })
        .select('id')
        .single()
      if (error) throw new Error(`enqueueChild failed: ${error.message}`)
      return (data as { id: string }).id
    },

    llm: async (opts) => {
      const result = await callLLM(opts)
      totalCostCents += result.cost_cents
      return result
    },

    supabase: supabaseAdmin,
  }

  // Validate input — permanent failure on bad schema
  const inputParsed = agent.inputSchema.safeParse(jobRow.payload)
  if (!inputParsed.success) {
    const error = inputParsed.error.message
    await supabaseAdmin
      .from('agent_jobs')
      .update({ status: 'failed', error, updated_at: new Date().toISOString() })
      .eq('id', jobRow.id)
    await ctx.emit('failed', { reason: 'invalid_input', error })
    return { status: 'failed', error }
  }

  // Mark running
  await supabaseAdmin
    .from('agent_jobs')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('id', jobRow.id)

  await ctx.emit('started', { attempt: jobRow.attempts + 1 })

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new AgentTimeoutError(agent.name, agent.maxRuntimeMs)),
      agent.maxRuntimeMs,
    )
  })

  try {
    const output = await Promise.race([agent.run(inputParsed.data, ctx), timeoutPromise])

    if (timeoutHandle) clearTimeout(timeoutHandle)

    const outputParsed = agent.outputSchema.safeParse(output)
    if (!outputParsed.success) {
      throw new Error(`Output schema invalid: ${outputParsed.error.message}`)
    }

    const duration = Date.now() - startTime

    await supabaseAdmin
      .from('agent_jobs')
      .update({
        status: 'done',
        result: output as Record<string, unknown>,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobRow.id)

    await supabaseAdmin.from('agent_runs').insert({
      job_id: jobRow.id,
      agent: agent.name,
      event: 'completed',
      data: { output },
      cost_cents: totalCostCents,
      duration_ms: duration,
    })

    return { status: 'done', result: outputParsed.data }
  } catch (err) {
    if (timeoutHandle) clearTimeout(timeoutHandle)

    const error = (err as Error).message
    const duration = Date.now() - startTime
    const newAttempts = jobRow.attempts + 1
    const isPermanent = newAttempts >= jobRow.max_attempts

    const backoffMs = Math.pow(2, newAttempts) * 30_000
    const nextRunAt = new Date(Date.now() + backoffMs).toISOString()

    await supabaseAdmin
      .from('agent_jobs')
      .update(
        isPermanent
          ? { status: 'failed', attempts: newAttempts, error, locked_until: null, updated_at: new Date().toISOString() }
          : { status: 'pending', attempts: newAttempts, error, run_at: nextRunAt, locked_until: null, updated_at: new Date().toISOString() },
      )
      .eq('id', jobRow.id)

    await supabaseAdmin.from('agent_runs').insert({
      job_id: jobRow.id,
      agent: agent.name,
      event: 'error',
      data: { error },
      cost_cents: totalCostCents,
      duration_ms: duration,
    })

    return { status: isPermanent ? 'failed' : 'retry', error }
  }
}
```

- [ ] **Step 3.4: Implement create-route.ts**

```typescript
// src/lib/agents/create-route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { runAgent } from '@/lib/agents/base'
import type { Agent } from '@/lib/agents/base'

export function createAgentRoute<I, O>(agent: Agent<I, O>) {
  return async function POST(req: NextRequest) {
    const body = await req.json() as { job_id?: string }
    if (!body.job_id) {
      return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })
    }

    const { data: job, error } = await supabaseAdmin
      .from('agent_jobs')
      .select('id, payload, attempts, max_attempts')
      .eq('id', body.job_id)
      .single()

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const result = await runAgent(agent, job as { id: string; payload: unknown; attempts: number; max_attempts: number })
    return NextResponse.json(result)
  }
}
```

- [ ] **Step 3.5: Run tests — confirm pass**

```bash
npx vitest run src/lib/agents/__tests__/base.test.ts
```

Expected: all 5 tests green.

- [ ] **Step 3.6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3.7: Commit**

```bash
git add src/lib/agents/base.ts src/lib/agents/create-route.ts src/lib/agents/__tests__/base.test.ts
git commit -m "feat(agents): BaseAgent framework — runAgent wrapper, AgentContext, createAgentRoute helper"
```

---

## Task 4: Research Agent + Enrichment Agent

**Files:**
- Create: `src/lib/agents/specialists/research.ts`
- Create: `src/lib/agents/specialists/enrichment.ts`

- [ ] **Step 4.1: Implement research.ts**

```typescript
// src/lib/agents/specialists/research.ts
import { z } from 'zod'
import { scrapeLeads } from '@/lib/scrapers/orchestrator'
import type { Agent, AgentContext } from '@/lib/agents/base'

const InputSchema = z.object({
  query: z.string(),
  location: z.string(),
  target: z.number().int().default(50),
})

const OutputSchema = z.object({
  leads_found: z.number().int(),
  jobs_enqueued: z.number().int(),
})

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const ResearchAgent: Agent<Input, Output> = {
  name: 'ResearchAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 120_000,

  async run(input, ctx) {
    const { leads } = await scrapeLeads(input.query, input.location, input.target)

    // Query DB to get persisted IDs (upsert doesn't return IDs by default)
    const externalIds = leads.map((l) => l.external_id)
    const { data: leadRows } = await ctx.supabase
      .from('scraped_leads')
      .select('id, external_id')
      .in('external_id', externalIds)

    const rows = (leadRows ?? []) as Array<{ id: string; external_id: string }>

    let jobsEnqueued = 0
    for (const row of rows) {
      await ctx.enqueueChild('EnrichmentAgent', { lead_id: row.id })
      jobsEnqueued++
    }

    await ctx.emit('research_complete', {
      leads_found: leads.length,
      location: input.location,
      jobs_enqueued: jobsEnqueued,
    })

    return { leads_found: leads.length, jobs_enqueued: jobsEnqueued }
  },
}
```

- [ ] **Step 4.2: Implement enrichment.ts**

```typescript
// src/lib/agents/specialists/enrichment.ts
import { z } from 'zod'
import { searchByName, getOfficers } from '@/lib/enrichment/companies-house'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ lead_id: z.string() })
const OutputSchema = z.object({ contact_id: z.string(), enriched: z.boolean() })

const UK_COUNTRIES = new Set(['uk', 'united kingdom', 'gb', 'great britain'])

const ExtractSchema = z.object({
  emails: z.array(z.string()),
  linkedinUrl: z.string().nullable(),
})

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const EnrichmentAgent: Agent<Input, Output> = {
  name: 'EnrichmentAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 60_000,

  async run(input, ctx) {
    const { data: lead, error } = await ctx.supabase
      .from('scraped_leads')
      .select('id, name, email, phone, website, country, city, source, rating, review_count')
      .eq('id', input.lead_id)
      .single()

    if (error || !lead) throw new Error(`Lead ${input.lead_id} not found`)

    const row = lead as {
      id: string; name: string; email: string | null; phone: string | null
      website: string | null; country: string | null; city: string | null
      source: string; rating: number | null; review_count: number | null
    }

    let emails: string[] = row.email ? [row.email] : []
    let linkedinUrl: string | null = null
    let officers: unknown[] = []

    // Homepage extraction
    if (row.website) {
      try {
        const resp = await fetch(row.website, { signal: AbortSignal.timeout(10_000) })
        const html = await resp.text()
        const { content } = await ctx.llm({
          tier: 'cheap',
          messages: [
            {
              role: 'system',
              content:
                'Extract contact info from HTML. Return JSON with emails array and linkedinUrl string or null.',
            },
            {
              role: 'user',
              content: `HTML (truncated): ${html.slice(0, 3000)}`,
            },
          ],
          schema: ExtractSchema,
        })
        if (content.emails.length > 0) emails = content.emails
        linkedinUrl = content.linkedinUrl
      } catch {
        // unreachable or LLM failed — proceed without
      }
    }

    // Companies House for UK
    const countryKey = (row.country ?? '').toLowerCase().trim()
    if (UK_COUNTRIES.has(countryKey) && row.name) {
      try {
        const companies = await searchByName(row.name)
        if (companies.length > 0) {
          officers = await getOfficers(companies[0].company_number)
        }
      } catch {
        // CH unavailable — proceed
      }
    }

    // Write enriched_data
    await ctx.supabase.from('enriched_data').insert({
      lead_id: input.lead_id,
      enrichment_source: 'EnrichmentAgent',
      data: { emails, linkedinUrl, officers },
    })

    // Upsert mak_contacts (conflict on email when present)
    const primaryEmail = emails[0] ?? null
    const upsertData = {
      name: row.name,
      email: primaryEmail,
      phone: row.phone,
      country: row.country,
      city: row.city,
      website: row.website,
      source: row.source,
      status: 'new',
      metadata: {
        lead_id: input.lead_id,
        linkedinUrl,
        rating: row.rating,
        review_count: row.review_count,
      },
    }

    let contactId: string

    if (primaryEmail) {
      const { data: upserted, error: upsertErr } = await ctx.supabase
        .from('mak_contacts')
        .upsert(upsertData, { onConflict: 'email' })
        .select('id')
        .single()
      if (upsertErr || !upserted) throw new Error(`Contact upsert failed: ${upsertErr?.message}`)
      contactId = (upserted as { id: string }).id
    } else {
      const { data: inserted, error: insertErr } = await ctx.supabase
        .from('mak_contacts')
        .insert(upsertData)
        .select('id')
        .single()
      if (insertErr || !inserted) throw new Error(`Contact insert failed: ${insertErr?.message}`)
      contactId = (inserted as { id: string }).id
    }

    // Link enriched_data to contact
    await ctx.supabase
      .from('enriched_data')
      .update({ contact_id: contactId })
      .eq('lead_id', input.lead_id)

    await ctx.enqueueChild('QualificationAgent', { contact_id: contactId })

    return { contact_id: contactId, enriched: true }
  },
}
```

- [ ] **Step 4.3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4.4: Commit**

```bash
git add src/lib/agents/specialists/research.ts src/lib/agents/specialists/enrichment.ts
git commit -m "feat(agents): ResearchAgent (scrape→enqueue) + EnrichmentAgent (homepage/CH/upsert)"
```

---

## Task 5: Qualification Agent + Personalization Agent

**Files:**
- Create: `src/lib/agents/specialists/qualification.ts`
- Create: `src/lib/agents/specialists/personalization.ts`

- [ ] **Step 5.1: Implement qualification.ts**

```typescript
// src/lib/agents/specialists/qualification.ts
import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ contact_id: z.string() })
const OutputSchema = z.object({ score: z.number(), qualified: z.boolean() })

const ScoreSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string(),
})

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const QualificationAgent: Agent<Input, Output> = {
  name: 'QualificationAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const { data: contact, error } = await ctx.supabase
      .from('mak_contacts')
      .select('id, name, email, phone, country, city, website, source, category, metadata')
      .eq('id', input.contact_id)
      .single()

    if (error || !contact) throw new Error(`Contact ${input.contact_id} not found`)

    const c = contact as {
      id: string; name: string; email: string | null; phone: string | null
      country: string | null; city: string | null; website: string | null
      source: string; category: string | null
      metadata: { rating?: number; review_count?: number; linkedinUrl?: string | null } | null
    }

    const { content } = await ctx.llm({
      tier: 'medium',
      messages: [
        {
          role: 'system',
          content:
            'Score this business lead 0-100 for outreach suitability. Factors: industry fit (food/hospitality preferred), size proxies (review count, rating), reachability (phone+email present = +20pts each), GDPR risk (EU/UK without consent = -30pts). Return JSON with score and reasoning.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            name: c.name,
            category: c.category,
            country: c.country,
            city: c.city,
            hasEmail: !!c.email,
            hasPhone: !!c.phone,
            hasWebsite: !!c.website,
            rating: c.metadata?.rating,
            reviewCount: c.metadata?.review_count,
          }),
        },
      ],
      schema: ScoreSchema,
    })

    // Update contact metadata with score
    await ctx.supabase
      .from('mak_contacts')
      .update({
        metadata: { ...(c.metadata ?? {}), score: content.score, score_reasoning: content.reasoning },
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.contact_id)

    const qualified = content.score >= 60

    if (qualified) {
      // Enqueue for each available channel
      if (c.email) {
        await ctx.enqueueChild('PersonalizationAgent', { contact_id: input.contact_id, channel: 'email' })
      }
      if (c.phone) {
        await ctx.enqueueChild('PersonalizationAgent', { contact_id: input.contact_id, channel: 'whatsapp' })
      }
    }

    await ctx.emit('qualified', { score: content.score, qualified, contact_id: input.contact_id })

    return { score: content.score, qualified }
  },
}
```

- [ ] **Step 5.2: Implement personalization.ts**

```typescript
// src/lib/agents/specialists/personalization.ts
import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({
  contact_id: z.string(),
  channel: z.enum(['email', 'whatsapp', 'call']),
})

const OutputSchema = z.object({ personalization_id: z.string() })

const PersonalizationSchema = z.object({
  whatsappVars: z.record(z.string(), z.string()).nullable(),
  emailSubject: z.string().nullable(),
  emailHtml: z.string().nullable(),
  callOpener: z.string().nullable(),
})

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const PersonalizationAgent: Agent<Input, Output> = {
  name: 'PersonalizationAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 60_000,

  async run(input, ctx) {
    const { data: contact, error } = await ctx.supabase
      .from('mak_contacts')
      .select('id, name, email, phone, country, city, category, metadata')
      .eq('id', input.contact_id)
      .single()

    if (error || !contact) throw new Error(`Contact ${input.contact_id} not found`)

    const c = contact as {
      id: string; name: string; email: string | null; phone: string | null
      country: string | null; city: string | null; category: string | null
      metadata: Record<string, unknown> | null
    }

    const contextStr = JSON.stringify({
      businessName: c.name,
      category: c.category,
      city: c.city,
      country: c.country,
      score: c.metadata?.score,
    })

    // cheap tier for WA vars + call opener
    const { content: cheapContent } = await ctx.llm({
      tier: 'cheap',
      messages: [
        {
          role: 'system',
          content:
            'Generate outreach personalization. Return JSON: whatsappVars (object with vars for template, keys are "1","2" etc.), callOpener (1-sentence phone opener). emailSubject and emailHtml set to null — those come separately.',
        },
        { role: 'user', content: contextStr },
      ],
      schema: PersonalizationSchema.partial(),
    })

    let emailHtml: string | null = null
    let emailSubject: string | null = null

    // premium tier only for email HTML draft
    if (input.channel === 'email') {
      const { content: premiumContent } = await ctx.llm({
        tier: 'premium',
        messages: [
          {
            role: 'system',
            content:
              'Write a short, personalized cold outreach email (150-200 words). Professional but warm. Focus on one specific value proposition for this business type. Return JSON: emailSubject (string), emailHtml (string with basic HTML).',
          },
          { role: 'user', content: contextStr },
        ],
        schema: z.object({ emailSubject: z.string(), emailHtml: z.string() }),
      })
      emailHtml = premiumContent.emailHtml
      emailSubject = premiumContent.emailSubject
    }

    const { data: row, error: insertErr } = await ctx.supabase
      .from('personalizations')
      .upsert(
        {
          contact_id: input.contact_id,
          channel: input.channel,
          whatsapp_vars: cheapContent.whatsappVars ?? null,
          email_subject: emailSubject,
          email_html: emailHtml,
          call_opener: cheapContent.callOpener ?? null,
        },
        { onConflict: 'contact_id,channel' },
      )
      .select('id')
      .single()

    if (insertErr || !row) throw new Error(`Personalization upsert failed: ${insertErr?.message}`)

    const personalizationId = (row as { id: string }).id

    // Enqueue outbound agent
    if (input.channel === 'email') {
      await ctx.enqueueChild('EmailAgent', { contact_id: input.contact_id, personalization_id: personalizationId })
    } else if (input.channel === 'whatsapp') {
      await ctx.enqueueChild('WhatsAppAgent', { contact_id: input.contact_id, personalization_id: personalizationId })
    } else if (input.channel === 'call') {
      await ctx.enqueueChild('CallAgent', { contact_id: input.contact_id, script_id: personalizationId })
    }

    return { personalization_id: personalizationId }
  },
}
```

- [ ] **Step 5.3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5.4: Commit**

```bash
git add src/lib/agents/specialists/qualification.ts src/lib/agents/specialists/personalization.ts
git commit -m "feat(agents): QualificationAgent (LLM score gate) + PersonalizationAgent (channel content)"
```

---

## Task 6: Email + WhatsApp + Call Agents

**Files:**
- Create: `src/lib/agents/specialists/email.ts`
- Create: `src/lib/agents/specialists/whatsapp.ts`
- Create: `src/lib/agents/specialists/call.ts`

- [ ] **Step 6.1: Implement email.ts**

```typescript
// src/lib/agents/specialists/email.ts
import { z } from 'zod'
import { sendEmail } from '@/lib/channels/brevo'
import { gateOutbound, ComplianceError } from '@/lib/channels/compliance'
import type { Agent } from '@/lib/agents/base'
import type { ContactForGate } from '@/lib/channels/compliance'

const InputSchema = z.object({
  contact_id: z.string(),
  personalization_id: z.string(),
})

const OutputSchema = z.object({ sent: z.boolean(), reason: z.string().optional() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const EmailAgent: Agent<Input, Output> = {
  name: 'EmailAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const [contactRes, personRes] = await Promise.all([
      ctx.supabase
        .from('mak_contacts')
        .select('id, email, phone, country, marketing_consent')
        .eq('id', input.contact_id)
        .single(),
      ctx.supabase
        .from('personalizations')
        .select('email_subject, email_html')
        .eq('id', input.personalization_id)
        .single(),
    ])

    if (contactRes.error || !contactRes.data) throw new Error(`Contact not found: ${input.contact_id}`)
    if (personRes.error || !personRes.data) throw new Error(`Personalization not found: ${input.personalization_id}`)

    const contact = contactRes.data as ContactForGate & { email: string | null }
    const person = personRes.data as { email_subject: string | null; email_html: string | null }

    if (!contact.email) return { sent: false, reason: 'no_email' }
    if (!person.email_subject || !person.email_html) return { sent: false, reason: 'no_email_content' }

    // Compliance gate
    try {
      await gateOutbound({ contact, channel: 'email' })
    } catch (err) {
      if (err instanceof ComplianceError) {
        await ctx.emit('compliance_blocked', { code: err.code, contact_id: input.contact_id })
        return { sent: false, reason: err.code }
      }
      throw err
    }

    const result = await sendEmail({
      to: contact.email,
      contactId: input.contact_id,
      subject: person.email_subject,
      html: person.email_html,
    })

    if (!result.ok && result.reason === 'API_ERROR') {
      // Transient — rethrow to trigger retry
      throw new Error(`Brevo API error: ${result.status}`)
    }

    await ctx.emit('email_sent', { ok: result.ok, contact_id: input.contact_id })
    return { sent: result.ok, reason: result.ok ? undefined : result.reason }
  },
}
```

- [ ] **Step 6.2: Implement whatsapp.ts**

```typescript
// src/lib/agents/specialists/whatsapp.ts
import { z } from 'zod'
import { sendWhatsAppTemplate } from '@/lib/channels/twilio'
import { gateOutbound, ComplianceError } from '@/lib/channels/compliance'
import { normalizePhone } from '@/lib/channels/normalize-phone'
import type { Agent } from '@/lib/agents/base'
import type { ContactForGate } from '@/lib/channels/compliance'

const InputSchema = z.object({
  contact_id: z.string(),
  personalization_id: z.string(),
})

const OutputSchema = z.object({ sent: z.boolean(), reason: z.string().optional() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const WhatsAppAgent: Agent<Input, Output> = {
  name: 'WhatsAppAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const [contactRes, personRes] = await Promise.all([
      ctx.supabase
        .from('mak_contacts')
        .select('id, email, phone, country, city, marketing_consent, name')
        .eq('id', input.contact_id)
        .single(),
      ctx.supabase
        .from('personalizations')
        .select('whatsapp_vars')
        .eq('id', input.personalization_id)
        .single(),
    ])

    if (contactRes.error || !contactRes.data) throw new Error(`Contact not found: ${input.contact_id}`)

    const contact = contactRes.data as ContactForGate & { name: string; city: string | null }
    const person = personRes.data as { whatsapp_vars: Record<string, string> | null } | null

    if (!contact.phone) return { sent: false, reason: 'no_phone' }

    const e164 = normalizePhone(contact.phone, contact.city ?? '', contact.country ?? '')
    if (!e164) return { sent: false, reason: 'invalid_phone' }

    // Compliance gate
    try {
      await gateOutbound({ contact: { ...contact, phone: e164 }, channel: 'whatsapp' })
    } catch (err) {
      if (err instanceof ComplianceError) {
        await ctx.emit('compliance_blocked', { code: err.code, contact_id: input.contact_id })
        return { sent: false, reason: err.code }
      }
      throw err
    }

    const result = await sendWhatsAppTemplate({
      to: e164,
      contactId: input.contact_id,
      businessName: contact.name,
      city: contact.city ?? '',
    })

    if (!result.ok) {
      // Twilio errors 21910 (not WA user) etc. are permanent — don't retry
      await ctx.emit('whatsapp_failed', { errorCode: result.errorCode, contact_id: input.contact_id })
      return { sent: false, reason: `twilio_${result.errorCode}` }
    }

    await ctx.emit('whatsapp_sent', { sid: result.sid, contact_id: input.contact_id })
    return { sent: true }
  },
}
```

- [ ] **Step 6.3: Implement call.ts**

```typescript
// src/lib/agents/specialists/call.ts
import { z } from 'zod'
import { triggerCall, ChannelDisabledError } from '@/lib/channels/bland'
import { gateOutbound, ComplianceError } from '@/lib/channels/compliance'
import type { Agent } from '@/lib/agents/base'
import type { ContactForGate } from '@/lib/channels/compliance'

const InputSchema = z.object({
  contact_id: z.string(),
  script_id: z.string(),
})

const OutputSchema = z.object({ sent: z.boolean(), reason: z.string().optional() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const CallAgent: Agent<Input, Output> = {
  name: 'CallAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    if (!process.env.BLAND_API_KEY) {
      await ctx.emit('voice_disabled', { contact_id: input.contact_id, reason: 'BLAND_API_KEY not configured' })
      return { sent: false, reason: 'voice_disabled' }
    }

    const { data: contact, error } = await ctx.supabase
      .from('mak_contacts')
      .select('id, email, phone, country, marketing_consent')
      .eq('id', input.contact_id)
      .single()

    if (error || !contact) throw new Error(`Contact not found: ${input.contact_id}`)

    const c = contact as ContactForGate

    try {
      await gateOutbound({ contact: c, channel: 'voice' })
    } catch (err) {
      if (err instanceof ComplianceError) {
        await ctx.emit('compliance_blocked', { code: err.code })
        return { sent: false, reason: err.code }
      }
      throw err
    }

    try {
      const result = await triggerCall({
        to: c.phone,
        contactId: input.contact_id,
        scriptOrPathway: input.script_id,
        leadContext: { contactId: input.contact_id },
      })
      await ctx.emit('call_triggered', { ok: result.ok })
      return { sent: result.ok, reason: result.ok ? undefined : result.errorMessage }
    } catch (err) {
      if (err instanceof ChannelDisabledError) {
        return { sent: false, reason: 'voice_disabled' }
      }
      throw err
    }
  },
}
```

- [ ] **Step 6.4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/agents/specialists/email.ts src/lib/agents/specialists/whatsapp.ts src/lib/agents/specialists/call.ts
git commit -m "feat(agents): EmailAgent, WhatsAppAgent, CallAgent — compliance-gated outbound"
```

---

## Task 7: Reply Agent + Scheduler Agent

**Files:**
- Create: `src/lib/agents/specialists/reply.ts`
- Create: `src/lib/agents/specialists/scheduler.ts`

- [ ] **Step 7.1: Implement reply.ts**

```typescript
// src/lib/agents/specialists/reply.ts
import { z } from 'zod'
import { sendEmail } from '@/lib/channels/brevo'
import { sendWhatsAppFreeform } from '@/lib/channels/twilio'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({
  outreach_log_id: z.string(),
  channel: z.enum(['email', 'whatsapp']),
  body: z.string(),
})

const OutputSchema = z.object({ replied: z.boolean(), contact_id: z.string() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

const MEETING_INTENT_KEYWORDS = [
  'meet', 'meeting', 'call', 'schedule', 'appointment', 'demo', 'chat', 'available',
  'book', 'time', 'calendar', 'zoom', 'interested', 'yes', 'sure', 'let\'s talk',
]

function hasMeetingIntent(text: string): boolean {
  const lower = text.toLowerCase()
  return MEETING_INTENT_KEYWORDS.some((kw) => lower.includes(kw))
}

export const ReplyAgent: Agent<Input, Output> = {
  name: 'ReplyAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 60_000,

  async run(input, ctx) {
    // Get the original outreach log to find contact_id
    const { data: log, error: logErr } = await ctx.supabase
      .from('outreach_logs')
      .select('contact_id, channel')
      .eq('id', input.outreach_log_id)
      .single()

    if (logErr || !log) throw new Error(`Outreach log ${input.outreach_log_id} not found`)

    const contactId = (log as { contact_id: string }).contact_id

    // Fetch conversation history (last 10 messages)
    const { data: history } = await ctx.supabase
      .from('outreach_logs')
      .select('direction, body, created_at')
      .eq('contact_id', contactId)
      .eq('channel', input.channel)
      .order('created_at', { ascending: true })
      .limit(10)

    const historyStr = ((history ?? []) as Array<{ direction: string; body: string | null }>)
      .map((h) => `${h.direction}: ${h.body ?? ''}`)
      .join('\n')

    // Generate reply with premium LLM
    const { content: reply } = await ctx.llm({
      tier: 'premium',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful business development assistant. Write a concise, professional reply to this inbound message. Keep it under 100 words. Do not use placeholders.',
        },
        {
          role: 'user',
          content: `Conversation history:\n${historyStr}\n\nLatest inbound: ${input.body}\n\nWrite a reply:`,
        },
      ],
    })

    // Get contact for sending
    const { data: contact } = await ctx.supabase
      .from('mak_contacts')
      .select('id, email, phone, country, city')
      .eq('id', contactId)
      .single()

    if (!contact) throw new Error(`Contact ${contactId} not found`)

    const c = contact as { id: string; email: string | null; phone: string | null; country: string | null; city: string | null }

    if (input.channel === 'email' && c.email) {
      await sendEmail({
        to: c.email,
        contactId,
        subject: 'Re: Your message',
        html: `<p>${reply}</p>`,
      })
    } else if (input.channel === 'whatsapp' && c.phone) {
      await sendWhatsAppFreeform({ to: c.phone, contactId, body: reply })
    }

    // Mark contact as responded
    await ctx.supabase
      .from('mak_contacts')
      .update({ status: 'responded', updated_at: new Date().toISOString() })
      .eq('id', contactId)

    // If meeting intent detected, enqueue SchedulerAgent
    if (hasMeetingIntent(input.body)) {
      await ctx.enqueueChild('SchedulerAgent', { contact_id: contactId })
    }

    await ctx.emit('reply_sent', { channel: input.channel, contact_id: contactId })

    return { replied: true, contact_id: contactId }
  },
}
```

- [ ] **Step 7.2: Implement scheduler.ts**

```typescript
// src/lib/agents/specialists/scheduler.ts
import { z } from 'zod'
import { sendEmail } from '@/lib/channels/brevo'
import { sendWhatsAppFreeform } from '@/lib/channels/twilio'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ contact_id: z.string() })
const OutputSchema = z.object({ scheduled: z.boolean() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

const BOOKING_URL = process.env.CAL_COM_URL ?? 'https://cal.com/mak-os/intro'

export const SchedulerAgent: Agent<Input, Output> = {
  name: 'SchedulerAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const { data: contact, error } = await ctx.supabase
      .from('mak_contacts')
      .select('id, name, email, phone, country, city')
      .eq('id', input.contact_id)
      .single()

    if (error || !contact) throw new Error(`Contact ${input.contact_id} not found`)

    const c = contact as { id: string; name: string; email: string | null; phone: string | null; country: string | null; city: string | null }

    const message = `Hi ${c.name}, thanks for your interest! You can book a quick 15-minute intro call here: ${BOOKING_URL}`

    if (c.email) {
      await sendEmail({
        to: c.email,
        contactId: input.contact_id,
        subject: 'Book a quick call',
        html: `<p>${message}</p>`,
      })
    } else if (c.phone) {
      await sendWhatsAppFreeform({ to: c.phone, contactId: input.contact_id, body: message })
    }

    const nextFollowUp = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    await ctx.supabase
      .from('mak_contacts')
      .update({ next_follow_up_at: nextFollowUp, updated_at: new Date().toISOString() })
      .eq('id', input.contact_id)

    await ctx.emit('booking_link_sent', { contact_id: input.contact_id, url: BOOKING_URL })

    return { scheduled: true }
  },
}
```

- [ ] **Step 7.3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7.4: Commit**

```bash
git add src/lib/agents/specialists/reply.ts src/lib/agents/specialists/scheduler.ts
git commit -m "feat(agents): ReplyAgent (LLM reply + meeting intent) + SchedulerAgent (booking link)"
```

---

## Task 8: CRM Sync Agent + Audit Agent

**Files:**
- Create: `src/lib/agents/specialists/crm-sync.ts`
- Create: `src/lib/agents/specialists/audit.ts`

- [ ] **Step 8.1: Implement crm-sync.ts**

```typescript
// src/lib/agents/specialists/crm-sync.ts
import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ contact_id: z.string() })
const OutputSchema = z.object({ synced: z.boolean(), fields_updated: z.array(z.string()) })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const CRMSyncAgent: Agent<Input, Output> = {
  name: 'CRMSyncAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const { data: contact, error } = await ctx.supabase
      .from('mak_contacts')
      .select('id, name, email, phone, source, country, city, metadata, status')
      .eq('id', input.contact_id)
      .single()

    if (error || !contact) throw new Error(`Contact ${input.contact_id} not found`)

    const c = contact as {
      id: string; name: string; email: string | null; phone: string | null
      source: string; country: string | null; city: string | null
      metadata: Record<string, unknown> | null; status: string
    }

    const updatedFields: string[] = []
    const updates: Record<string, unknown> = {}

    // If source attribution missing, check scraped_leads
    if (!c.source || c.source === 'unknown') {
      const { data: leads } = await ctx.supabase
        .from('scraped_leads')
        .select('source')
        .eq('email', c.email ?? '')
        .limit(1)
      const leadRow = (leads ?? []) as Array<{ source: string }>
      if (leadRow.length > 0) {
        updates.source = leadRow[0].source
        updatedFields.push('source')
      }
    }

    // Fill missing email from enriched_data
    if (!c.email) {
      const { data: enriched } = await ctx.supabase
        .from('enriched_data')
        .select('data')
        .eq('contact_id', input.contact_id)
        .limit(1)
      const enrichedRow = (enriched ?? []) as Array<{ data: { emails?: string[] } }>
      if (enrichedRow.length > 0 && enrichedRow[0].data.emails?.length) {
        updates.email = enrichedRow[0].data.emails[0]
        updatedFields.push('email')
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      await ctx.supabase.from('mak_contacts').update(updates).eq('id', input.contact_id)
    }

    // Write activity log
    await ctx.supabase.from('mak_activity_log').insert({
      entity_type: 'contact',
      entity_id: input.contact_id,
      action: 'crm_sync',
      details: { fields_updated: updatedFields, source: c.source },
    })

    await ctx.emit('crm_synced', { contact_id: input.contact_id, fields_updated: updatedFields })

    return { synced: true, fields_updated: updatedFields }
  },
}
```

- [ ] **Step 8.2: Implement audit.ts**

```typescript
// src/lib/agents/specialists/audit.ts
import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({
  contact_id: z.string(),
  target_company: z.string(),
})

const OutputSchema = z.object({ report_id: z.string(), tokens_used: z.number() })

const AuditSchema = z.object({
  report: z.string(),
  sections: z.array(z.string()),
})

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const AuditAgent: Agent<Input, Output> = {
  name: 'AuditAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 120_000,

  async run(input, ctx) {
    const { data: contact } = await ctx.supabase
      .from('mak_contacts')
      .select('name, category, city, country, website, metadata')
      .eq('id', input.contact_id)
      .single()

    const c = (contact ?? {}) as {
      name: string; category: string | null; city: string | null
      country: string | null; website: string | null; metadata: Record<string, unknown> | null
    }

    const { content, cost_cents } = await ctx.llm({
      tier: 'premium',
      messages: [
        {
          role: 'system',
          content: `You are a business analyst. Write a concise free business audit report (~3000 tokens) for the following business. Cover: 
1. Online presence assessment 
2. Key opportunities for improvement 
3. Competitive positioning 
4. 3 actionable recommendations 
5. Summary verdict

Be specific and actionable. This will be shared as a value-add with the business owner.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            companyName: input.target_company,
            category: c.category,
            city: c.city,
            country: c.country,
            website: c.website,
            rating: c.metadata?.rating,
            reviewCount: c.metadata?.review_count,
          }),
        },
      ],
    })

    const approxTokens = Math.round(cost_cents / 0.0003)

    const { data: report, error } = await ctx.supabase
      .from('audit_reports')
      .insert({
        contact_id: input.contact_id,
        target_company: input.target_company,
        report_text: content as string,
        tokens_used: approxTokens,
      })
      .select('id')
      .single()

    if (error || !report) throw new Error(`Audit report insert failed: ${error?.message}`)

    await ctx.emit('audit_complete', { report_id: (report as { id: string }).id, tokens: approxTokens })

    return { report_id: (report as { id: string }).id, tokens_used: approxTokens }
  },
}
```

- [ ] **Step 8.3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8.4: Commit**

```bash
git add src/lib/agents/specialists/crm-sync.ts src/lib/agents/specialists/audit.ts
git commit -m "feat(agents): CRMSyncAgent (source attribution + activity log) + AuditAgent (premium LLM report)"
```

---

## Task 9: Source Health + Compliance + Deliverability + Orchestrator Agents

**Files:**
- Create: `src/lib/agents/specialists/source-health.ts`
- Create: `src/lib/agents/specialists/compliance.ts`
- Create: `src/lib/agents/specialists/deliverability.ts`
- Create: `src/lib/agents/specialists/orchestrator.ts`

- [ ] **Step 9.1: Implement source-health.ts**

```typescript
// src/lib/agents/specialists/source-health.ts
import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({})
const OutputSchema = z.object({ alerts: z.number().int(), sources_checked: z.number().int() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const SourceHealthAgent: Agent<Input, Output> = {
  name: 'SourceHealthAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(_input, ctx) {
    const today = new Date().toISOString().slice(0, 10)

    const { data: rows } = await ctx.supabase
      .from('source_health')
      .select('source, requests_made, requests_failed, daily_quota')
      .eq('date', today)

    const sources = (rows ?? []) as Array<{
      source: string; requests_made: number; requests_failed: number; daily_quota: number | null
    }>

    let alerts = 0

    for (const s of sources) {
      const failureRate = s.requests_made > 0 ? s.requests_failed / s.requests_made : 0
      const quotaHit = s.daily_quota != null && s.requests_made >= s.daily_quota

      if (failureRate > 0.5 || quotaHit) {
        alerts++
        await ctx.supabase.from('agent_runs').insert({
          agent: 'SourceHealthAgent',
          event: 'alert',
          data: {
            source: s.source,
            failure_rate: failureRate,
            quota_hit: quotaHit,
            requests_made: s.requests_made,
            requests_failed: s.requests_failed,
          },
        })
      }
    }

    return { alerts, sources_checked: sources.length }
  },
}
```

- [ ] **Step 9.2: Implement compliance.ts (standalone audit agent)**

```typescript
// src/lib/agents/specialists/compliance.ts
import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ contact_id: z.string() })
const OutputSchema = z.object({ passed: z.boolean(), violations: z.array(z.string()) })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

// Standalone daily audit agent — checks for DNC violations in outreach_logs
export const ComplianceAgent: Agent<Input, Output> = {
  name: 'ComplianceAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    const violations: string[] = []

    // Check if contact is in DNC but still has outbound logs
    const { data: dncRow } = await ctx.supabase
      .from('dnc_list')
      .select('id, reason')
      .eq('contact_id', input.contact_id)
      .maybeSingle()

    if (dncRow) {
      // Check if outbound logs exist after DNC was added
      const { data: logs } = await ctx.supabase
        .from('outreach_logs')
        .select('id, created_at, channel')
        .eq('contact_id', input.contact_id)
        .eq('direction', 'outbound')
        .limit(5)

      const logRows = (logs ?? []) as Array<{ id: string; channel: string }>
      if (logRows.length > 0) {
        violations.push(`DNC_VIOLATION: ${logRows.length} outbound messages sent to DNC contact`)
        await ctx.emit('alert', {
          type: 'DNC_VIOLATION',
          contact_id: input.contact_id,
          log_count: logRows.length,
        })
      }
    }

    // Check GDPR: EU/UK contact with marketing_consent != true but has outbound logs
    const EU_UK = ['uk', 'united kingdom', 'gb', 'de', 'fr', 'nl', 'be', 'es', 'it', 'eu']

    const { data: contact } = await ctx.supabase
      .from('mak_contacts')
      .select('country, marketing_consent')
      .eq('id', input.contact_id)
      .single()

    if (contact) {
      const c = contact as { country: string | null; marketing_consent: boolean | null }
      const countryKey = (c.country ?? '').toLowerCase().trim()
      if (EU_UK.includes(countryKey) && c.marketing_consent !== true) {
        const { data: outboundLogs } = await ctx.supabase
          .from('outreach_logs')
          .select('id')
          .eq('contact_id', input.contact_id)
          .eq('direction', 'outbound')
          .limit(1)
        if ((outboundLogs ?? []).length > 0) {
          violations.push(`GDPR_VIOLATION: EU/UK contact sent without consent`)
          await ctx.emit('alert', { type: 'GDPR_VIOLATION', contact_id: input.contact_id })
        }
      }
    }

    return { passed: violations.length === 0, violations }
  },
}
```

- [ ] **Step 9.3: Implement deliverability.ts**

```typescript
// src/lib/agents/specialists/deliverability.ts
import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({})
const OutputSchema = z.object({ channels_paused: z.array(z.string()), alerts: z.number().int() })

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

const BOUNCE_THRESHOLD = 0.05   // 5%
const SPAM_THRESHOLD = 0.005    // 0.5%

export const DeliverabilityAgent: Agent<Input, Output> = {
  name: 'DeliverabilityAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 60_000,

  async run(_input, ctx) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const channelsPaused: string[] = []
    let alerts = 0

    // Email deliverability
    const { data: emailLogs } = await ctx.supabase
      .from('outreach_logs')
      .select('status')
      .eq('channel', 'email')
      .eq('direction', 'outbound')
      .gte('created_at', since)

    const emailRows = (emailLogs ?? []) as Array<{ status: string | null }>
    if (emailRows.length > 0) {
      const bounces = emailRows.filter((r) => r.status === 'hard_bounce' || r.status === 'soft_bounce').length
      const spams = emailRows.filter((r) => r.status === 'spam').length
      const bounceRate = bounces / emailRows.length
      const spamRate = spams / emailRows.length

      if (bounceRate > BOUNCE_THRESHOLD || spamRate > SPAM_THRESHOLD) {
        await ctx.supabase.from('system_state').upsert({
          key: 'channel_paused:email',
          value: { paused: true, reason: `bounce ${(bounceRate * 100).toFixed(1)}% spam ${(spamRate * 100).toFixed(1)}%`, paused_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        channelsPaused.push('email')
        alerts++
        await ctx.emit('alert', { type: 'EMAIL_DELIVERABILITY', bounce_rate: bounceRate, spam_rate: spamRate })
      }
    }

    // WhatsApp deliverability
    const { data: waLogs } = await ctx.supabase
      .from('outreach_logs')
      .select('status')
      .eq('channel', 'whatsapp')
      .eq('direction', 'outbound')
      .gte('created_at', since)

    const waRows = (waLogs ?? []) as Array<{ status: string | null }>
    if (waRows.length > 0) {
      const waFailed = waRows.filter((r) => r.status === 'failed').length
      const waFailRate = waFailed / waRows.length
      if (waFailRate > BOUNCE_THRESHOLD) {
        await ctx.supabase.from('system_state').upsert({
          key: 'channel_paused:whatsapp',
          value: { paused: true, reason: `fail_rate ${(waFailRate * 100).toFixed(1)}%`, paused_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        channelsPaused.push('whatsapp')
        alerts++
        await ctx.emit('alert', { type: 'WHATSAPP_DELIVERABILITY', fail_rate: waFailRate })
      }
    }

    return { channels_paused: channelsPaused, alerts }
  },
}
```

- [ ] **Step 9.4: Implement orchestrator.ts**

```typescript
// src/lib/agents/specialists/orchestrator.ts
import { z } from 'zod'
import type { Agent } from '@/lib/agents/base'

const InputSchema = z.object({ goal: z.string() })
const OutputSchema = z.object({ jobs_enqueued: z.number().int(), plan: z.string() })

const PlanSchema = z.object({
  query: z.string(),
  location: z.string(),
  target: z.number().int().min(1).max(500),
  reasoning: z.string(),
})

type Input = z.infer<typeof InputSchema>
type Output = z.infer<typeof OutputSchema>

export const OrchestratorAgent: Agent<Input, Output> = {
  name: 'OrchestratorAgent',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  maxRuntimeMs: 30_000,

  async run(input, ctx) {
    // Decompose goal into research parameters
    const { content: plan } = await ctx.llm({
      tier: 'premium',
      messages: [
        {
          role: 'system',
          content:
            'Decompose this outreach goal into research parameters. Return JSON: query (business type to search), location (city/area), target (number of leads, max 500), reasoning (why these params).',
        },
        { role: 'user', content: input.goal },
      ],
      schema: PlanSchema,
    })

    // Enqueue ResearchAgent — returns immediately after enqueue (Vercel timeout safety)
    await ctx.enqueueChild('ResearchAgent', {
      query: plan.query,
      location: plan.location,
      target: plan.target,
    })

    await ctx.emit('plan_created', {
      goal: input.goal,
      query: plan.query,
      location: plan.location,
      target: plan.target,
    })

    return { jobs_enqueued: 1, plan: plan.reasoning }
  },
}
```

- [ ] **Step 9.5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 9.6: Commit**

```bash
git add src/lib/agents/specialists/
git commit -m "feat(agents): SourceHealth, Compliance, Deliverability, Orchestrator agents"
```

---

## Task 10: All Agent Routes + Orchestrator Entry + Drain-Jobs Cron

**Files (create all 15 agent routes + 2 infra routes):**

- [ ] **Step 10.1: Create all 15 agent route files**

Each file is identical in structure — only the agent import changes. Create all 15:

```typescript
// src/app/api/agents/research/route.ts
import { ResearchAgent } from '@/lib/agents/specialists/research'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(ResearchAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/enrichment/route.ts
import { EnrichmentAgent } from '@/lib/agents/specialists/enrichment'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(EnrichmentAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/qualification/route.ts
import { QualificationAgent } from '@/lib/agents/specialists/qualification'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(QualificationAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/personalization/route.ts
import { PersonalizationAgent } from '@/lib/agents/specialists/personalization'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(PersonalizationAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/email/route.ts
import { EmailAgent } from '@/lib/agents/specialists/email'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(EmailAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/whatsapp/route.ts
import { WhatsAppAgent } from '@/lib/agents/specialists/whatsapp'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(WhatsAppAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/call/route.ts
import { CallAgent } from '@/lib/agents/specialists/call'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(CallAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/reply/route.ts
import { ReplyAgent } from '@/lib/agents/specialists/reply'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(ReplyAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/scheduler/route.ts
import { SchedulerAgent } from '@/lib/agents/specialists/scheduler'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(SchedulerAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/crm-sync/route.ts
import { CRMSyncAgent } from '@/lib/agents/specialists/crm-sync'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(CRMSyncAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/audit/route.ts
import { AuditAgent } from '@/lib/agents/specialists/audit'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(AuditAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/source-health/route.ts
import { SourceHealthAgent } from '@/lib/agents/specialists/source-health'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(SourceHealthAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/compliance/route.ts
import { ComplianceAgent } from '@/lib/agents/specialists/compliance'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(ComplianceAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/deliverability/route.ts
import { DeliverabilityAgent } from '@/lib/agents/specialists/deliverability'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(DeliverabilityAgent)
export const dynamic = 'force-dynamic'
```

```typescript
// src/app/api/agents/orchestrator/route.ts
import { OrchestratorAgent } from '@/lib/agents/specialists/orchestrator'
import { createAgentRoute } from '@/lib/agents/create-route'
export const POST = createAgentRoute(OrchestratorAgent)
export const dynamic = 'force-dynamic'
```

- [ ] **Step 10.2: Create orchestrator entry route**

```typescript
// src/app/api/orchestrator/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json() as { goal?: string }
  if (!body.goal) {
    return NextResponse.json({ error: 'Missing goal' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('agent_jobs')
    .insert({
      agent: 'OrchestratorAgent',
      payload: { goal: body.goal },
      status: 'pending',
      run_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({ job_id: (data as { id: string }).id })
}
```

- [ ] **Step 10.3: Create drain-jobs cron route**

```typescript
// src/app/api/cron/drain-jobs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Map agent name → route path
const AGENT_ROUTES: Record<string, string> = {
  ResearchAgent: '/api/agents/research',
  EnrichmentAgent: '/api/agents/enrichment',
  QualificationAgent: '/api/agents/qualification',
  PersonalizationAgent: '/api/agents/personalization',
  EmailAgent: '/api/agents/email',
  WhatsAppAgent: '/api/agents/whatsapp',
  CallAgent: '/api/agents/call',
  ReplyAgent: '/api/agents/reply',
  SchedulerAgent: '/api/agents/scheduler',
  CRMSyncAgent: '/api/agents/crm-sync',
  AuditAgent: '/api/agents/audit',
  SourceHealthAgent: '/api/agents/source-health',
  ComplianceAgent: '/api/agents/compliance',
  DeliverabilityAgent: '/api/agents/deliverability',
  OrchestratorAgent: '/api/agents/orchestrator',
}

export async function POST(req: NextRequest) {
  const now = new Date().toISOString()
  const appUrl = process.env.APP_URL ?? `https://${process.env.VERCEL_URL}`

  // Select up to 20 pending jobs ready to run and not currently locked
  const { data: jobs, error } = await supabaseAdmin
    .from('agent_jobs')
    .select('id, agent, payload, attempts, max_attempts')
    .eq('status', 'pending')
    .lte('run_at', now)
    .or(`locked_until.is.null,locked_until.lt.${now}`)
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const pending = (jobs ?? []) as Array<{ id: string; agent: string; payload: unknown; attempts: number; max_attempts: number }>

  if (pending.length === 0) {
    return NextResponse.json({ dispatched: 0 })
  }

  // Lock all selected jobs
  const jobIds = pending.map((j) => j.id)

  // Calculate lock durations per agent (we lock for longer than the maxRuntime)
  // Use a fixed 120s lock as a safe default for the drain poller
  const lockUntil = new Date(Date.now() + 120_000).toISOString()

  await supabaseAdmin
    .from('agent_jobs')
    .update({ locked_until: lockUntil, updated_at: now })
    .in('id', jobIds)

  // Fire-and-forget: dispatch each job to its agent route
  for (const job of pending) {
    const routePath = AGENT_ROUTES[job.agent]
    if (!routePath) {
      console.warn(`[drain-jobs] Unknown agent: ${job.agent}`)
      continue
    }

    // void: intentionally not awaited
    void fetch(`${appUrl}${routePath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id }),
    }).catch((err: unknown) => {
      console.error(`[drain-jobs] Dispatch failed for job ${job.id}: ${(err as Error).message}`)
    })
  }

  return NextResponse.json({ dispatched: pending.length })
}
```

- [ ] **Step 10.4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 10.5: Commit**

```bash
git add src/app/api/agents/ src/app/api/orchestrator/ src/app/api/cron/
git commit -m "feat(routes): 15 agent routes + orchestrator entry + drain-jobs cron"
```

---

## Task 11: E2E Pipeline Test

**Files:**
- Create: `vitest.e2e.config.ts`
- Create: `src/__tests__/e2e/full-pipeline.spec.ts`
- Modify: `package.json` (add e2e script)

- [ ] **Step 11.1: Create vitest.e2e.config.ts**

```typescript
// vitest.e2e.config.ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['src/__tests__/e2e/**/*.spec.ts'],
    testTimeout: 90_000,
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 11.2: Add e2e script to package.json**

In `package.json`, add to the `scripts` section:

```json
"test:e2e": "vitest run --config vitest.e2e.config.ts"
```

The full scripts section becomes:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest",
  "test:run": "vitest run",
  "test:e2e": "vitest run --config vitest.e2e.config.ts"
}
```

- [ ] **Step 11.3: Write the E2E test**

```typescript
// src/__tests__/e2e/full-pipeline.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// ─── In-memory DB ──────────────────────────────────────────────────────────────

type Row = Record<string, unknown>
const tables: Record<string, Row[]> = {
  scraped_leads: [],
  enriched_data: [],
  mak_contacts: [],
  outreach_logs: [],
  agent_jobs: [],
  agent_runs: [],
  personalizations: [],
  dnc_list: [],
  whatsapp_lookups: [],
  source_health: [],
  system_state: [],
}

let idCounter = 0
function nextId() { return `test-id-${++idCounter}` }

function resetDB() {
  for (const k of Object.keys(tables)) tables[k] = []
  idCounter = 0
}

function createMockSupabase() {
  function makeBuilder(tableName: string) {
    let filters: Array<{ col: string; val: unknown; op: string }> = []
    let _limit: number | null = null
    let _order: { col: string; asc: boolean } | null = null
    let insertData: Row | Row[] | null = null
    let updateData: Row | null = null
    let upsertData: Row | null = null
    let upsertConflict: string | null = null
    let selectCols: string | null = null
    let headMode = false

    const builder: Record<string, unknown> = {
      select(cols?: string, opts?: { count?: string; head?: boolean }) {
        selectCols = cols ?? '*'
        headMode = opts?.head ?? false
        return builder
      },
      eq(col: string, val: unknown) { filters.push({ col, val, op: 'eq' }); return builder },
      lte(col: string, val: unknown) { filters.push({ col, val, op: 'lte' }); return builder },
      gte(col: string, val: unknown) { filters.push({ col, val, op: 'gte' }); return builder },
      lt(col: string, val: unknown) { filters.push({ col, val, op: 'lt' }); return builder },
      gt(col: string, val: unknown) { filters.push({ col, val, op: 'gt' }); return builder },
      or(_expr: string) { return builder }, // no-op for tests
      in(col: string, vals: unknown[]) { filters.push({ col, val: vals, op: 'in' }); return builder },
      is(col: string, val: unknown) { filters.push({ col, val, op: 'is' }); return builder },
      limit(n: number) { _limit = n; return builder },
      order(col: string, opts?: { ascending?: boolean }) {
        _order = { col, asc: opts?.ascending ?? true }
        return builder
      },
      maybeSingle() {
        const rows = applyFilters(tableName, filters)
        return Promise.resolve({ data: rows[0] ?? null, error: null })
      },
      single() {
        const rows = applyFilters(tableName, filters)
        if (rows.length === 0) return Promise.resolve({ data: null, error: { message: 'not found', code: 'PGRST116' } })
        return Promise.resolve({ data: rows[0], error: null })
      },
      insert(data: Row | Row[]) {
        insertData = data
        const arr = Array.isArray(data) ? data : [data]
        const inserted = arr.map((r) => ({ id: nextId(), ...r }))
        tables[tableName].push(...inserted)
        insertData = inserted[0]
        return builder
      },
      upsert(data: Row, opts?: { onConflict?: string }) {
        upsertData = data
        upsertConflict = opts?.onConflict ?? null
        const existing = upsertConflict
          ? tables[tableName].find((r) => {
              return upsertConflict!.split(',').every((col) => r[col.trim()] === data[col.trim()])
            })
          : null
        if (existing) {
          Object.assign(existing, data)
          upsertData = existing
        } else {
          const row = { id: nextId(), ...data }
          tables[tableName].push(row)
          upsertData = row
        }
        return builder
      },
      update(data: Row) {
        updateData = data
        const rows = applyFilters(tableName, filters)
        for (const row of rows) Object.assign(row, data)
        return builder
      },
      then(resolve: (val: unknown) => void) {
        // Support bare await on insert/update/upsert
        if (insertData !== null) return resolve({ data: insertData, error: null })
        if (updateData !== null) return resolve({ data: null, error: null })
        if (upsertData !== null) return resolve({ data: upsertData, error: null })
        const rows = applyFilters(tableName, filters)
        const limited = _limit ? rows.slice(0, _limit) : rows
        if (headMode) return resolve({ count: limited.length, error: null })
        return resolve({ data: limited, error: null })
      },
    }

    // Make builder thenable
    ;(builder as { then?: unknown }).then = builder.then

    return builder
  }

  function applyFilters(tableName: string, filters: Array<{ col: string; val: unknown; op: string }>) {
    return (tables[tableName] ?? []).filter((row) =>
      filters.every(({ col, val, op }) => {
        if (op === 'eq') return row[col] === val
        if (op === 'in') return (val as unknown[]).includes(row[col])
        if (op === 'is') return val === null ? row[col] == null : row[col] === val
        if (op === 'gte') return String(row[col]) >= String(val)
        if (op === 'lte') return String(row[col]) <= String(val)
        if (op === 'gt') return String(row[col]) > String(val)
        if (op === 'lt') return String(row[col]) < String(val)
        return true
      }),
    )
  }

  return {
    from: (tableName: string) => makeBuilder(tableName),
  }
}

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockSupabase = createMockSupabase()

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: mockSupabase,
  createClient: () => mockSupabase,
}))

// Mock scraper orchestrator: returns 5 fake leads and inserts them into DB
vi.mock('@/lib/scrapers/orchestrator', () => ({
  scrapeLeads: vi.fn(async (_query: string, _location: string, target: number) => {
    const count = Math.min(target, 5)
    const leads = Array.from({ length: count }, (_, i) => ({
      id: nextId(),
      source: 'overpass',
      external_id: `ext-${i + 1}`,
      name: `Test Cafe ${i + 1}`,
      email: `cafe${i + 1}@example.com`,
      phone: `+971501234${String(i + 1).padStart(3, '0')}`,
      website: null,
      country: 'uae',
      city: 'manchester',
      category: 'cafe',
      rating: 4.5,
      review_count: 100,
    }))
    // Insert into in-memory DB
    for (const lead of leads) {
      tables.scraped_leads.push(lead)
    }
    return { leads, sources_used: ['overpass'], leads_per_source: { overpass: count } }
  }),
}))

// Mock LLM router
vi.mock('@/lib/llm/router', () => ({
  callLLM: vi.fn(async (opts: { tier: string; schema?: z.ZodSchema }) => {
    // OrchestratorAgent goal decomposition
    if (opts.schema) {
      const shape = (opts.schema as z.ZodObject<z.ZodRawShape>).shape ?? {}
      if ('query' in shape) {
        return { content: { query: 'cafes', location: 'Manchester', target: 5, reasoning: 'test' }, cost_cents: 0 }
      }
      if ('score' in shape) {
        return { content: { score: 75, reasoning: 'Good fit' }, cost_cents: 0 }
      }
      if ('emailSubject' in shape && 'emailHtml' in shape) {
        return { content: { emailSubject: 'Hello from MAK', emailHtml: '<p>Hello</p>' }, cost_cents: 0 }
      }
      if ('emails' in shape) {
        return { content: { emails: [], linkedinUrl: null }, cost_cents: 0 }
      }
      if ('whatsappVars' in shape) {
        return { content: { whatsappVars: { '1': 'Test Cafe', '2': 'Manchester' }, callOpener: 'Hi!', emailSubject: null, emailHtml: null }, cost_cents: 0 }
      }
    }
    return { content: 'mock reply', cost_cents: 0 }
  }),
}))

// Mock channel functions
vi.mock('@/lib/channels/brevo', () => ({
  sendEmail: vi.fn(async (args: { to: string; contactId: string; subject: string; html: string }) => {
    tables.outreach_logs.push({
      id: nextId(),
      contact_id: args.contactId,
      channel: 'email',
      direction: 'outbound',
      status: 'sent',
      subject: args.subject,
      brevo_id: `brevo-${nextId()}`,
      created_at: new Date().toISOString(),
    })
    return { ok: true, brevoId: `brevo-${nextId()}` }
  }),
}))

vi.mock('@/lib/channels/twilio', () => ({
  sendWhatsAppTemplate: vi.fn(async (args: { to: string; contactId: string }) => {
    tables.outreach_logs.push({
      id: nextId(),
      contact_id: args.contactId,
      channel: 'whatsapp',
      direction: 'outbound',
      status: 'queued',
      twilio_sid: `SM${nextId()}`,
      created_at: new Date().toISOString(),
    })
    return { ok: true, sid: `SM${nextId()}`, status: 'queued' }
  }),
  sendWhatsAppFreeform: vi.fn(),
  lookupWhatsApp: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/channels/compliance', () => ({
  gateOutbound: vi.fn().mockResolvedValue(undefined),
  ComplianceError: class ComplianceError extends Error {
    code: string
    constructor(code: string, message: string) { super(message); this.code = code }
  },
}))

vi.mock('@/lib/enrichment/companies-house', () => ({
  searchByName: vi.fn().mockResolvedValue([]),
  getOfficers: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/channels/normalize-phone', () => ({
  normalizePhone: vi.fn((_phone: string) => '+971501234001'),
}))

// ─── Test helpers ─────────────────────────────────────────────────────────────

async function stepJobs(maxIterations = 100): Promise<void> {
  const { runAgent } = await import('@/lib/agents/base')
  const { ResearchAgent } = await import('@/lib/agents/specialists/research')
  const { EnrichmentAgent } = await import('@/lib/agents/specialists/enrichment')
  const { QualificationAgent } = await import('@/lib/agents/specialists/qualification')
  const { PersonalizationAgent } = await import('@/lib/agents/specialists/personalization')
  const { EmailAgent } = await import('@/lib/agents/specialists/email')
  const { WhatsAppAgent } = await import('@/lib/agents/specialists/whatsapp')
  const { OrchestratorAgent } = await import('@/lib/agents/specialists/orchestrator')

  const agentMap: Record<string, unknown> = {
    OrchestratorAgent,
    ResearchAgent,
    EnrichmentAgent,
    QualificationAgent,
    PersonalizationAgent,
    EmailAgent,
    WhatsAppAgent,
  }

  for (let i = 0; i < maxIterations; i++) {
    const pending = tables.agent_jobs.filter(
      (j) => j.status === 'pending' || j.status === 'running',
    ) as Array<{ id: string; agent: string; payload: unknown; attempts: number; max_attempts: number; status: string }>

    if (pending.length === 0) break

    // Process one job at a time
    const job = pending.find((j) => j.status === 'pending')
    if (!job) break

    job.status = 'running'

    const agent = agentMap[job.agent as string]
    if (!agent) {
      job.status = 'done'
      continue
    }

    await runAgent(agent as Parameters<typeof runAgent>[0], {
      id: job.id,
      payload: job.payload,
      attempts: job.attempts as number,
      max_attempts: job.max_attempts as number,
    })
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Full pipeline E2E', () => {
  beforeEach(async () => {
    resetDB()
    vi.clearAllMocks()
  })

  it('runs goal "5 cafes in Manchester" through full pipeline deterministically', async () => {
    const { OrchestratorAgent } = await import('@/lib/agents/specialists/orchestrator')
    const { runAgent } = await import('@/lib/agents/base')

    // Step 1: Insert orchestrator job
    const orchestratorJob = {
      id: nextId(),
      agent: 'OrchestratorAgent',
      payload: { goal: '5 cafes in Manchester' },
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
    }
    tables.agent_jobs.push(orchestratorJob)

    // Step 2: Run full cascade
    await stepJobs(200)

    // Assertions
    expect(tables.scraped_leads.length).toBe(5)
    expect(tables.enriched_data.length).toBe(5)
    expect(tables.mak_contacts.length).toBe(5)

    const outboundLogs = tables.outreach_logs.filter((l) => l.direction === 'outbound')
    expect(outboundLogs.length).toBeGreaterThanOrEqual(5)

    const errorRuns = tables.agent_runs.filter((r) => r.event === 'error')
    expect(errorRuns.length).toBe(0)

    const failedJobs = tables.agent_jobs.filter((j) => j.status === 'failed')
    expect(failedJobs.length).toBe(0)
  })
})
```

- [ ] **Step 11.4: Run E2E test**

```bash
pnpm vitest run --config vitest.e2e.config.ts
```

Expected: 1 test passes.

- [ ] **Step 11.5: Run 5 times to verify determinism**

```bash
for i in 1 2 3 4 5; do pnpm vitest run --config vitest.e2e.config.ts; done
```

Expected: all 5 runs green.

- [ ] **Step 11.6: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 11.7: Commit**

```bash
git add vitest.e2e.config.ts src/__tests__/e2e/full-pipeline.spec.ts package.json
git commit -m "test(e2e): full pipeline test — 5 cafes Manchester, mocked services, deterministic"
```

---

## Self-Review Against Spec

| Spec Requirement | Task |
|-----------------|------|
| LLM router — Groq cheap, OpenRouter medium/premium | Task 2 ✓ |
| Tier fallback on failure + logged warning | Task 2 ✓ |
| JSON schema validation via Zod | Task 2 ✓ |
| cost_cents written to agent_runs | Task 3 ✓ (ctx.emit) |
| BaseAgent interface with inputSchema, outputSchema, maxRuntimeMs | Task 3 ✓ |
| AgentContext: emit, enqueueChild, llm, supabase | Task 3 ✓ |
| runAgent: input validation → dead on bad schema | Task 3 ✓ |
| runAgent: timeout → retry | Task 3 ✓ |
| runAgent: exponential backoff | Task 3 ✓ |
| runAgent: dead after max_attempts | Task 3 ✓ |
| POST {job_id} route pattern for all agents | Task 10 ✓ |
| ResearchAgent → scrape + enqueue EnrichmentAgent × leads | Task 4 ✓ |
| EnrichmentAgent → homepage LLM extract + Companies House (UK) | Task 4 ✓ |
| EnrichmentAgent → write enriched_data + upsert mak_contacts | Task 4 ✓ |
| QualificationAgent → LLM score 0–100 medium tier | Task 5 ✓ |
| QualificationAgent → gate at 60, enqueue PersonalizationAgent | Task 5 ✓ |
| PersonalizationAgent → premium only for emailHtml | Task 5 ✓ |
| PersonalizationAgent → write personalizations table | Task 5 ✓ |
| EmailAgent → compliance gate + Brevo send | Task 6 ✓ |
| EmailAgent → retry on transient fail | Task 6 ✓ (throws, runAgent retries) |
| WhatsAppAgent → compliance gate + Twilio WA send | Task 6 ✓ |
| CallAgent → voice_disabled log if no BLAND_API_KEY | Task 6 ✓ |
| ReplyAgent → conversation history + premium LLM + same channel | Task 7 ✓ |
| ReplyAgent → status='responded' | Task 7 ✓ |
| SchedulerAgent → booking link + next_follow_up_at | Task 7 ✓ |
| CRMSyncAgent → source attribution + mak_activity_log | Task 8 ✓ |
| AuditAgent → premium ~3k tokens + audit_reports table | Task 8 ✓ |
| SourceHealthAgent → >50% fail rate alert | Task 9 ✓ |
| ComplianceAgent → DNC violation audit | Task 9 ✓ |
| DeliverabilityAgent → 7d rates + system_state pause | Task 9 ✓ |
| OrchestratorAgent → LLM decompose + enqueue ResearchAgent immediately | Task 9 ✓ |
| POST /api/orchestrator → enqueue job, return job_id | Task 10 ✓ |
| drain-jobs → ≤20 pending, lock, fire-and-forget | Task 10 ✓ |
| personalizations table + RLS | Task 1 ✓ |
| audit_reports table + RLS | Task 1 ✓ |
| system_state table + RLS | Task 1 ✓ |
| mak_contacts metadata column | Task 1 ✓ |
| E2E: 5 leads, 5 enriched, 5 contacts, 5 outreach_logs, 0 errors | Task 11 ✓ |
| E2E deterministic 5 runs | Task 11 ✓ |
| No secret in LLM messages | router.ts reads from env at HTTP time ✓ |
| RLS on all new tables | Task 1 ✓ |
