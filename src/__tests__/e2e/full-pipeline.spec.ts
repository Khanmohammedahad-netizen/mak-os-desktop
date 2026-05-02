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
      or(_expr: string) { return builder },
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
        return builder
      },
      then(resolve: (val: unknown) => void) {
        if (insertData !== null) return resolve({ data: insertData, error: null })
        if (updateData !== null) {
          const rows = applyFilters(tableName, filters)
          for (const row of rows) Object.assign(row, updateData)
          return resolve({ data: null, error: null })
        }
        if (upsertData !== null) return resolve({ data: upsertData, error: null })
        const rows = applyFilters(tableName, filters)
        const limited = _limit ? rows.slice(0, _limit) : rows
        if (headMode) return resolve({ count: limited.length, error: null })
        return resolve({ data: limited, error: null })
      },
    }

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
    for (const lead of leads) {
      tables.scraped_leads.push(lead)
    }
    return { leads, sources_used: ['overpass'], leads_per_source: { overpass: count } }
  }),
}))

vi.mock('@/lib/llm/router', () => ({
  callLLM: vi.fn(async (opts: { tier: string; schema?: z.ZodSchema }) => {
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

    const orchestratorJob = {
      id: nextId(),
      agent: 'OrchestratorAgent',
      payload: { goal: '5 cafes in Manchester' },
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
    }
    tables.agent_jobs.push(orchestratorJob)

    await stepJobs(200)

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
