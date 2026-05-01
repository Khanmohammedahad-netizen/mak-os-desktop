# Phase C — 15-Agent Outreach Runtime: Design Spec

**Date:** 2026-05-01
**Author:** Mohammed Ahad Khan
**Status:** Approved

---

## 1. Overview

Phase C builds the autonomous outreach runtime on top of Phase A (scrapers) and Phase B (channels). It consists of:

- An LLM router (3 cost tiers)
- A `BaseAgent` framework with job locking, retries, timeout, and cost tracking
- 15 specialist agents covering the full pipeline from research to audit
- A job-drain cron route hit by GitHub Actions
- An E2E pipeline test (mocked services, deterministic)

Execution model: **HTTP-dispatch on Vercel serverless** (Option A). Each agent is a Next.js route handler. A cron-driven drain-jobs route locks and dispatches pending jobs via fire-and-forget `fetch()`. No new infrastructure required.

---

## 2. Architecture

```
POST /api/orchestrator { goal }
  → inserts OrchestratorAgent job
  → returns { job_id }

GitHub Actions cron (1 min interval, added in Phase D)
  → POST /api/cron/drain-jobs
      → SELECT ≤20 pending jobs WHERE run_at ≤ NOW AND (locked_until IS NULL OR locked_until < NOW)
      → UPDATE locked_until = NOW + maxRuntimeMs (per agent)
      → fire-and-forget fetch() to /api/agents/<name> for each job
      → return { dispatched: N }

/api/agents/<name> POST { job_id }
  → runAgent(agent, jobRow):
      1. Zod-validate payload → fail immediately on bad schema (no retry)
      2. SET status='running', emit 'started'
      3. Promise.race([agent.run(input, ctx), timeout(maxRuntimeMs)])
      4. Zod-validate output → retry on failure (LLM flakiness)
      5. SET status='done', emit 'completed'
      6. On any error: increment attempts, exponential backoff run_at, mark 'dead' at max_attempts
      7. Always write duration_ms + cost_cents to agent_runs
```

### Cascade for `goal "5 cafes Manchester"`

```
OrchestratorAgent
  └─ ResearchAgent (query=cafes, location=Manchester, target=5)
       └─ EnrichmentAgent × 5
            └─ QualificationAgent × 5
                 └─ PersonalizationAgent × N (score ≥ 60)
                      └─ EmailAgent OR WhatsAppAgent × N
                           (ComplianceAgent inline pre-flight)
```

Cron agents run standalone:
- `SourceHealthAgent` — every 15 min
- `DeliverabilityAgent` — daily
- `ComplianceAgent` audit — daily

---

## 3. LLM Router

**File:** `src/lib/llm/router.ts`

| Tier | Provider | Model | Use cases |
|------|----------|-------|-----------|
| cheap | Groq REST | llama-3.3-70b-versatile | classify, dedup, simple templating |
| medium | OpenRouter | claude-haiku-4-5-20251001 | qualify, score, reasoning |
| premium | OpenRouter | claude-sonnet-4-6 | cold email drafts, audit reports, reply generation |

**Interface:**
```typescript
callLLM({ tier, messages, schema? }): Promise<{ content: string | T, cost_cents: number }>
```

**Behaviour:**
- If `schema` (Zod) provided → appends JSON instruction, parses + validates response
- On HTTP error or parse failure → log warning + escalate to next tier
- Returns `{ content, cost_cents }` — caller writes cost to `agent_runs` via `ctx.emit`
- Keys read from `process.env` at HTTP call time only — never serialised into `messages[]`

**Env vars needed:**
- `GROQ_API_KEY` (new — user to provide)
- `OPENROUTER_API_KEY` (exists from Phase B)

---

## 4. BaseAgent Framework

**File:** `src/lib/agents/base.ts`

```typescript
interface AgentContext {
  jobId: string
  emit(event: string, data: unknown): Promise<void>
  enqueueChild(agent: string, payload: unknown, runAt?: Date): Promise<string>
  llm: typeof callLLM
  supabase: SupabaseClient
}

interface Agent<I, O> {
  name: string
  inputSchema: ZodSchema<I>
  outputSchema: ZodSchema<O>
  maxRuntimeMs: number
  run(input: I, ctx: AgentContext): Promise<O>
}
```

**`runAgent(agent, jobRow)` contract:**
- Bad input → `status='failed'`, no retry, error stored
- Timeout → `AgentTimeoutError`, counts as attempt, retries
- Network errors → retry
- LLM output Zod failure → retry (transient)
- `cost_cents` accumulated across all LLM calls, written once per run
- Backoff: `run_at = NOW + 2^attempts * 30s`
- Dead after `max_attempts` exhausted → `status='dead'`

---

## 5. New DB Migrations

### `0004_agents.sql`

**`personalizations`**
```sql
CREATE TABLE personalizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES mak_contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  whatsapp_vars JSONB,
  email_subject TEXT,
  email_html TEXT,
  call_opener TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`audit_reports`**
```sql
CREATE TABLE audit_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES mak_contacts(id) ON DELETE CASCADE,
  target_company TEXT NOT NULL,
  report_text TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`system_state`**
```sql
CREATE TABLE system_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- e.g. key='channel_paused:email', value={"paused":true,"reason":"bounce >5%"}
```

All three: RLS enabled, `allow_all` policy (matches existing pattern).

### `0005_contacts_phase_c.sql`

```sql
ALTER TABLE mak_contacts
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;

-- mak_activity_log used by CRMSyncAgent; create if not already present from Phase A
CREATE TABLE IF NOT EXISTS mak_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES mak_contacts(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE mak_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS allow_all_mak_activity_log ON mak_activity_log FOR ALL USING (true) WITH CHECK (true);
```

---

## 6. Agent Catalog

All agents live at `src/lib/agents/specialists/<name>.ts`.
All routes live at `src/app/api/agents/<name>/route.ts` (POST `{ job_id }`).

| # | Agent | Input | Key action | Enqueues |
|---|-------|-------|-----------|----------|
| 1 | ResearchAgent | `{query,location,target}` | `/api/scrapers/orchestrate` | EnrichmentAgent × leads |
| 2 | EnrichmentAgent | `{lead_id}` | fetch homepage → LLM extract emails+LinkedIn (cheap); Companies House if UK; upsert mak_contacts | QualificationAgent |
| 3 | QualificationAgent | `{contact_id}` | LLM score 0–100 (medium) on industry fit, size, reachability, GDPR risk; write metadata.score | PersonalizationAgent if ≥60 |
| 4 | PersonalizationAgent | `{contact_id,channel}` | generate `{whatsappVars,emailSubject,emailHtml,callOpener}`; premium tier for emailHtml only; write personalizations row | EmailAgent or WhatsAppAgent |
| 5 | EmailAgent | `{contact_id,personalization_id}` | compliance gate → `/api/channels/email/send`; self-enqueue with backoff on transient fail | — |
| 6 | WhatsAppAgent | `{contact_id,personalization_id}` | compliance gate → `/api/channels/whatsapp/send` | — |
| 7 | CallAgent | `{contact_id,script_id}` | no BLAND_API_KEY → log `voice_disabled`, done; else `/api/channels/call/trigger` | — |
| 8 | ReplyAgent | `{outreach_log_id,channel,body}` | fetch conversation history → premium LLM reply → send same channel; set status='responded' | SchedulerAgent if meeting intent detected |
| 9 | SchedulerAgent | `{contact_id}` | detect meeting intent in replies → generate Cal.com/manual booking link → send as reply; set next_follow_up_at | — |
| 10 | CRMSyncAgent | `{contact_id}` | cross-check scraped_leads↔mak_contacts; fill source attribution gaps; write mak_activity_log | — |
| 11 | AuditAgent | `{contact_id,target_company}` | premium LLM ~3k tokens → generate business audit; write audit_reports | — |
| 12 | SourceHealthAgent | `{}` | read source_health; if any source >50% fail rate or quota hit → insert agent_runs event='alert' | — |
| 13 | ComplianceAgent | `{contact_id}` | inline: wraps `gateOutbound()`; standalone daily audit: flag any send-to-DNC violations | — |
| 14 | DeliverabilityAgent | `{}` | compute 7d bounce + spam rates from outreach_logs; if email bounce >5% or spam >0.5% → write pause flag to system_state + insert alert | — |
| 15 | OrchestratorAgent | `{goal}` | premium LLM decomposes goal → enqueue ResearchAgent child; return immediately (Vercel timeout safety) | ResearchAgent |

---

## 7. Key Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/orchestrator` | POST | Entry point — enqueue OrchestratorAgent job |
| `/api/agents/<name>` | POST | Execute one job for named agent |
| `/api/cron/drain-jobs` | POST | Lock + dispatch ≤20 pending jobs |

---

## 8. Error Handling Rules

- No agent may swallow errors silently — all errors surface to `runAgent()` catch
- `ComplianceError` → `status='failed'`, no retry (not transient)
- `AgentTimeoutError` → retry with backoff
- Network errors → retry
- Input Zod failure → `status='dead'` immediately (bad job data)
- Output Zod failure → retry (LLM flakiness)
- LLM tier escalation → `ctx.emit('llm_escalation', {from, to, reason})`
- Accumulated `cost_cents` written once per run regardless of success/failure

---

## 9. Security Constraints

- `callLLM()` receives only `messages[]` — no env vars, API keys, Supabase URLs ever appear in message content
- `supabaseAdmin` client never serialised into LLM prompts
- All new tables (`personalizations`, `audit_reports`, `system_state`) have RLS enabled
- Existing RLS pattern (`allow_all` service-role) preserved

---

## 10. E2E Test

**File:** `src/__tests__/e2e/full-pipeline.spec.ts`

- Mock all external HTTP: Twilio, Brevo, Groq, OpenRouter, all 5 scrapers
- Mock Supabase client with in-memory store
- POST `/api/orchestrator` with `goal "5 cafes in Manchester"`
- Manually step job poller in a loop (max 60s / 100 iterations)
- Assert:
  - 5 rows in `scraped_leads`
  - 5 rows in `enriched_data`
  - 5 rows in `mak_contacts`
  - 5 rows in `outreach_logs` (whatsapp or email per source data)
  - 0 `agent_runs` rows with event='error'
- Deterministic: fixed mock UUIDs, fixed scraper response fixtures, no `Date.now()` variance in assertions
- Run command: `pnpm vitest run e2e`

---

## 11. Quality Gates

| Gate | Criterion |
|------|-----------|
| TypeScript | `tsc --noEmit` zero errors |
| E2E test | Passes deterministically 5 runs in a row |
| Code review | No agent swallows errors silently |
| Security audit | No secret in LLM messages; RLS on all new tables |

---

## 12. File Map

```
src/lib/llm/
  router.ts

src/lib/agents/
  base.ts
  specialists/
    research.ts, enrichment.ts, qualification.ts, personalization.ts
    email.ts, whatsapp.ts, call.ts, reply.ts, scheduler.ts
    crm-sync.ts, audit.ts, source-health.ts, compliance.ts
    deliverability.ts, orchestrator.ts

src/app/api/
  orchestrator/route.ts
  cron/drain-jobs/route.ts
  agents/
    research/route.ts, enrichment/route.ts, qualification/route.ts
    personalization/route.ts, email/route.ts, whatsapp/route.ts
    call/route.ts, reply/route.ts, scheduler/route.ts
    crm-sync/route.ts, audit/route.ts, source-health/route.ts
    compliance/route.ts, deliverability/route.ts, orchestrator/route.ts

src/__tests__/e2e/
  full-pipeline.spec.ts

supabase/migrations/
  0004_agents.sql
  0005_contacts_phase_c.sql
```
