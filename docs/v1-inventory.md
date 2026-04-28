# MAK OS v1 Inventory
Source: `./reference/mak-os-v1` (read-only, not committed)

---

## API Routes — 33 total (`/src/app/api/`)

| Route | File |
|---|---|
| `/api/agents` | agents/route.ts |
| `/api/agents/tasks` | agents/tasks/route.ts |
| `/api/clients` | clients/route.ts |
| `/api/cron/daily-run` | cron/daily-run/route.ts |
| `/api/cron/followup` | cron/followup/route.ts |
| `/api/cron/phone-follow-up` | cron/phone-follow-up/route.ts |
| `/api/cron/phone-outreach` | cron/phone-outreach/route.ts |
| `/api/cron/process-queue` | cron/process-queue/route.ts |
| `/api/cron/reply-check` | cron/reply-check/route.ts |
| `/api/github/repositories/[id]/resync` | github/repositories/[id]/resync/route.ts |
| `/api/github/sync` | github/sync/route.ts |
| `/api/github/webhook` | github/webhook/route.ts |
| `/api/leads` | leads/route.ts |
| `/api/leads/email` | leads/email/route.ts |
| `/api/leads/enrich` | leads/enrich/route.ts |
| `/api/leads/whatsapp` | leads/whatsapp/route.ts |
| `/api/mobile/auto-run` | mobile/auto-run/route.ts |
| `/api/mobile/history` | mobile/history/route.ts |
| `/api/mobile/phone-leads` | mobile/phone-leads/route.ts |
| `/api/mobile/phone-run` | mobile/phone-run/route.ts |
| `/api/mobile/run` | mobile/run/route.ts |
| `/api/mobile/test-call` | mobile/test-call/route.ts |
| `/api/outreach/queue` | outreach/queue/route.ts |
| `/api/outreach/run` | outreach/run/route.ts |
| `/api/projects` | projects/route.ts |
| `/api/repos` | repos/route.ts |
| `/api/repos/create` | repos/create/route.ts |
| `/api/repos/list` | repos/list/route.ts |
| `/api/repos/sync` | repos/sync/route.ts |
| `/api/test-whatsapp` | test-whatsapp/route.ts |
| `/api/webhooks/call-outcome` | webhooks/call-outcome/route.ts |
| `/api/webhooks/twilio-whatsapp` | webhooks/twilio-whatsapp/route.ts |
| `/api/webhooks/zoho` | webhooks/zoho/route.ts |

> Note: spec said 29 routes; actual count is 33 (mobile/* routes 6 not 2).

---

## Agent Files (`/agents/`)

| File | Role |
|---|---|
| `agent-registry.ts` | Central registry mapping agent names to classes |
| `automation-agent.ts` | General automation tasks |
| `base-agent.ts` | Abstract base class all agents extend |
| `developer-agent.ts` | Code/dev task execution |
| `devops-agent.ts` | CI/CD, infra operations |
| `lead-finder-agent.ts` | Lead discovery/scraping |
| `marketing-agent.ts` | Outreach campaign execution |
| `research-agent.ts` | Web research / enrichment |
| `security-agent.ts` | Security scanning |
| `website-audit-agent.ts` | Website analysis |

Also `/core/`: `skill-loader.ts`, `skill-registry.json`, `skill-router.ts`, `workflow-intent-router.ts`
Also `/runtime/`: `openclaw-runtime.ts`, `permission-manager.ts`, `tool-executor.ts`
Also `/control-layer/`: `agent-monitor.ts`, `dashboard.tsx`, `logs-viewer.ts`, `task-queue.ts`, `workflow-monitor.ts`

---

## Channel Integrations (`/src/lib/`)

| Channel | Files |
|---|---|
| WhatsApp | `channels/whatsapp.ts`, `actions/whatsapp-outreach.ts`, `utils/whatsapp-lookup.ts` |
| Instagram DM | `channels/instagram-dm.ts` |
| Email (Brevo) | `email/brevo.ts`, `email/service.ts`, `email/bounce-handler.ts`, `email/warmup-schedule.ts` |
| Phone/AI calls | `agents/ai-call-agent.ts`, `agents/phone-outreach-agent.ts`, `phone/carrier-lookup.ts` |
| SMS | `agents/sms-gateway-agent.ts` |
| GitHub | `github/app.ts`, `github/repos.ts`, `github/retry.ts` |
| Web scraping | `apify.ts` |
| Supabase | `supabase/admin.ts`, `supabase/client.ts`, `supabase/server.ts`, `supabase-admin.ts` |

Also: `outreach-engine.ts`, `outreach-queue.ts`, `quality-gate.ts`, `cost-tracker.ts`, `task-parser.ts`, `cron-auth.ts`, `sales-generators.ts`

---

## Database Tables (Supabase)

Extracted from `.from()` calls across all `/src/**/*.ts`:

| Table | Purpose |
|---|---|
| `leads` | Core prospect records |
| `clients` | Client accounts |
| `projects` | Client projects |
| `repositories` | GitHub repos |
| `outreach_log` | All outreach activity |
| `phone_outreach_log` | Phone-specific outreach |
| `phone_leads_pending` | Leads queued for phone |
| `phone_sequences_due` | Scheduled phone sequences |
| `phone_suppression_list` | DNC list for phone |
| `email_suppression_list` | DNC list for email |
| `email_cache` | Cached email lookups |
| `carrier_cache` | Phone carrier lookup cache |
| `research_cache` | Enrichment data cache |
| `replies` | Inbound reply tracking |
| `pipeline_runs` | Cron job run history |
| `scheduler_config` | Cron/scheduler settings |
| `api_cost_log` | API spend tracking |
| `todays_cities` | Daily geo-targeting data |

Schema migrations in `/sql/migrations/`: `add_phone_columns.sql`, `add_whatsapp_lookup_columns_v2.sql`, `add_whatsapp_outreach_columns.sql`
Full schema: `/setup_master_pipeline.sql`, `/setup_scheduler.sql`
