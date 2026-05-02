# MAK OS v1 Inventory
Source: `./reference/mak-os-v1` (read-only, not committed)

---

## 1. API Routes — 33 total

| Path | Method | Purpose |
|------|--------|---------|
| `/api/agents` | GET | Retrieve agent metadata, skill registry, and workflow definitions |
| `/api/agents/tasks` | POST | Submit task descriptions, match to workflows, trigger outreach pipeline with streaming response |
| `/api/clients` | POST, DELETE | Create and delete client records for authenticated users |
| `/api/cron/daily-run` | GET | Daily scheduled pipeline trigger for multi-city lead generation runs |
| `/api/cron/followup` | GET | Send follow-up email touches 2 and 3 after 4–6+ day delays |
| `/api/cron/phone-follow-up` | GET | Process phone sequence follow-ups for touch 2 based on SQL view |
| `/api/cron/phone-outreach` | GET | Daily phone outreach batch processing respecting SMS/WhatsApp/call limits |
| `/api/cron/process-queue` | GET | Pulse cron — processes one queued lead per execution with email/WhatsApp channel selection |
| `/api/cron/reply-check` | GET | Health check; actual reply detection via Zoho Mail webhook |
| `/api/github/repositories/[id]/resync` | POST | Fetch fresh metadata from GitHub API and sync to Supabase |
| `/api/github/sync` | POST | Bulk sync all org repositories to database via GitHub App |
| `/api/github/webhook` | POST | GitHub App webhook handler for repository create/update/delete events |
| `/api/leads` | GET, POST | List all leads or create single lead with company name and email |
| `/api/leads/email` | POST | Manually send personalized cold email to a lead via Brevo |
| `/api/leads/enrich` | POST | Run Apify contact scraper on lead website, trigger WhatsApp fallback |
| `/api/leads/whatsapp` | POST | Manually trigger WhatsApp outreach for a specific lead |
| `/api/mobile/auto-run` | GET, POST | Control scheduler state (start/stop/run_once) and fetch configuration |
| `/api/mobile/history` | GET | Fetch recent leads and compute outreach metrics for mobile dashboard |
| `/api/mobile/phone-leads` | GET | Retrieve pending and active phone outreach sequences |
| `/api/mobile/phone-run` | POST | Batch process phone leads with multi-channel selection |
| `/api/mobile/run` | POST | Simplified mobile trigger for outreach pipeline with task string parsing |
| `/api/mobile/test-call` | POST | Initiate test AI call via Bland.ai with logging |
| `/api/outreach/queue` | POST | Process queued leads respecting daily email limits |
| `/api/outreach/run` | POST | Full autonomous outreach pipeline with category, city, and dry-run options |
| `/api/projects` | POST | Create project records linked to clients |
| `/api/repos/create` | POST | Create repository records in Supabase with optional GitHub template integration |
| `/api/repos/list` | GET | List org repositories and sync to database |
| `/api/repos` | GET | Fetch user's repositories from database |
| `/api/repos/sync` | POST | Full repository sync from GitHub org to database |
| `/api/test-whatsapp` | GET | Test WhatsApp outreach with manual phone or random GCC lead |
| `/api/webhooks/call-outcome` | POST | Handle Bland.ai call completion, classify outcome, trigger follow-up SMS |
| `/api/webhooks/twilio-whatsapp` | POST | Capture Twilio WhatsApp delivery status updates and sync to outreach_log |
| `/api/webhooks/zoho` | POST | Parse incoming email replies, classify sentiment, update lead status |

---

## 2. Agents (`/agents/`)

| File | Input Shape | Output Shape | Description |
|------|-------------|--------------|-------------|
| `base-agent.ts` | `TaskInput { description: string, parameters?: Record<string, unknown> }` | `AgentResult { agentName, taskDescription, activatedSkills, systemPrompt, reasoning[], status }` | Abstract base class; skill activation via semantic search + system prompt assembly |
| `lead-finder-agent.ts` | `{ query: string, region?: string, industry?: string }` | `AgentResult` | Finds and scores qualified business leads via Google Maps scraping + contact enrichment + ICP matching |
| `website-audit-agent.ts` | `{ url: string, depth?: 'quick'\|'standard'\|'deep' }` | `AgentResult` | Technical SEO, performance, security, accessibility audits with Lighthouse |
| `marketing-agent.ts` | `{ objective: string, channels?: string[] }` | `AgentResult` | Creates marketing strategies, content plans, growth campaigns with competitor analysis |
| `research-agent.ts` | `{ topic: string, depth?: 'surface'\|'standard'\|'deep-dive' }` | `AgentResult` | Market research, competitive intelligence, trend analysis with sourced claims |
| `developer-agent.ts` | `{ feature: string, stack?: string[] }` | `AgentResult` | Implements Next.js/TypeScript code following enterprise architecture patterns |
| `devops-agent.ts` | `{ target: string, environment?: 'staging'\|'production' }` | `AgentResult` | Designs CI/CD pipelines, infrastructure-as-code, deployment automation |
| `security-agent.ts` | `{ target: string, scope?: 'application'\|'infrastructure'\|'full' }` | `AgentResult` | Vulnerability identification, penetration testing, OWASP compliance assessment |
| `automation-agent.ts` | `{ process: string, tools?: string[] }` | `AgentResult` | Designs n8n/Zapier workflows, API integrations, event-driven automation pipelines |
| `agent-registry.ts` | N/A (registry pattern) | `{ getAgent(id), listAgents(), dispatch(taskDescription) }` | Central registry: agent lookup, listing, intelligent dispatch by task keywords |

Also: `/core/` — `skill-loader.ts`, `skill-registry.json`, `skill-router.ts`, `workflow-intent-router.ts`
Also: `/runtime/` — `openclaw-runtime.ts`, `permission-manager.ts`, `tool-executor.ts`
Also: `/control-layer/` — `agent-monitor.ts`, `dashboard.tsx`, `logs-viewer.ts`, `task-queue.ts`, `workflow-monitor.ts`

---

## 3. Channel Integrations

| File | Exported Functions |
|------|--------------------|
| `src/lib/email/brevo.ts` | `sendViaBrevo(options: BrevoEmailOptions): Promise<{ success, messageId?, error? }>` · `sendWithRetry(options, maxAttempts?): Promise<{ success, messageId?, error? }>` |
| `src/lib/email/service.ts` | `sendOutreachEmail(options: OutreachEmailOptions): Promise<{ success, messageId?, error?, provider: 'brevo' }>` |
| `src/lib/channels/whatsapp.ts` | `sendWhatsAppMessage(recipientPhone, messageBody, businessId?, token?): Promise<{ success, messageId?, error? }>` · `formatForWhatsApp(phone): string` |
| `src/lib/agents/ai-call-agent.ts` | `generateCallScript(input: CallScriptInput): string` · `initiateAICall(phoneNumber, script, leadId, voice?): Promise<{ success, callId?, disabled? }>` · `getIssueStatement(category, name, city): string` |
| `src/lib/agents/phone-outreach-agent.ts` | `selectChannel(lead: PhoneLead): ChannelDecision` · `executeChannel(channel, lead, ctx): Promise<boolean>` · `processLeadSequence(lead, touchNumber: 1\|2\|3): Promise<{ success, channelUsed, error? }>` |
| `src/lib/agents/sms-gateway-agent.ts` | `generateSMS(input: SMSInput): Promise<{ body, characterCount, approved }>` · `sendSMSViaGateway(phoneNumber, messageBody, carrier?): Promise<{ success, gatewaysAttempted }>` |
| `src/lib/actions/whatsapp-outreach.ts` | `isOnWhatsApp(phone, leadId): Promise<boolean>` · `sendWhatsAppTemplate(to, contentSid, variables): Promise<TwilioResponse>` · `triggerWhatsAppOutreach(lead, bypassCheck?): Promise<{ success, sid?, error?, body? }>` |
| `src/lib/zoho-mail.ts` | `sendEmail(options: EmailOptions): Promise<SentMessageInfo>` · `buildOutreachVariants(lead): EmailVariant[]` |

Also: `outreach-engine.ts`, `outreach-queue.ts`, `quality-gate.ts`, `cost-tracker.ts`, `task-parser.ts`, `cron-auth.ts`, `sales-generators.ts`

---

## 4. Database Tables (Supabase)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `leads` | `id UUID PK`, `company`, `email`, `phone`, `city`, `category`, `status`, `owner_id`, `website`, `lead_score`, `priority_score`, `whatsapp_registered`, `whatsapp_checked_at`, `contacted_at`, `replied_at`, `email_status`, `whatsapp_status`, `email_sent_at`, `whatsapp_sent_at` | Core lead CRM with multi-channel outreach tracking |
| `outreach_log` | `id UUID PK`, `lead_id FK`, `business_name`, `email_address`, `touch_number`, `subject`, `body`, `send_status`, `sent_at`, `channel`, `message_sid`, `whatsapp_status`, `wa_status`, `sequence_status`, `variant_used`, `gate_score` | All outreach touches (email, SMS, WhatsApp, calls) per lead |
| `replies` | `id UUID PK`, `lead_id FK`, `outreach_id FK`, `email_address`, `body`, `sentiment`, `reply_from`, `received_at`, `operator_notified` | Inbound replies with sentiment classification |
| `phone_outreach_log` | `id UUID PK`, `lead_id FK`, `business_name`, `phone_number`, `channel`, `touch_number`, `message_body`, `send_status`, `sent_at`, `call_outcome`, `call_duration_seconds`, `sequence_status`, `carrier`, `original_phone`, `normalized_phone` | Phone channel logging (SMS, WhatsApp, AI calls) |
| `phone_suppression_list` | `phone_number PK` | DNC list for phone outreach |
| `email_suppression_list` | (inferred) `email PK` | DNC list for email outreach |
| `scheduler_config` | `id UUID PK`, `scheduler_enabled`, `daily_send_limit`, `daily_budget_cap`, `cities`, `notification_email`, `touch2_delay_days`, `touch3_delay_days`, `timezone` | Global scheduler configuration for daily cron jobs |
| `pipeline_runs` | `id UUID PK`, `triggered_by`, `city`, `category`, `leads_found`, `leads_passed`, `leads_rejected`, `emails_sent`, `emails_failed`, `run_started_at`, `run_completed_at`, `status`, `error_log`, `cost_estimate` | Audit log per pipeline execution |
| `api_cost_log` | `id UUID PK`, `service`, `action`, `estimated_cost_usd`, `pipeline_run_id FK`, `called_at` | API cost tracking per service per pipeline run |
| `research_cache` | `cache_key PK`, `raw_data JSONB`, `city`, `category`, `created_at`, `expires_at` | Caches Apify scrape results |
| `email_cache` | `domain PK`, `email`, `confidence`, `source`, `discovered_at` | Caches enriched email addresses by domain |
| `carrier_cache` | (inferred) `phone PK`, `carrier`, `cached_at` | Caches phone carrier lookup results |
| `repositories` | `id UUID PK`, `owner_id FK`, `name`, `github_repo_id`, `github_full_name`, `clone_url`, `visibility`, `is_template`, `topics`, `synced_at`, `project_id FK` | GitHub repository metadata |
| `clients` | `id UUID PK`, `name`, `owner_id FK` | Client records for project management |
| `projects` | `id UUID PK`, `name`, `client_id FK`, `owner_id FK` | Projects linked to clients |
| `todays_cities` (VIEW) | `cities_today TEXT[]` | Rotates cities daily for automated scheduling |
| `phone_leads_pending` (VIEW) | `id`, `company`, `city`, `category`, `phone`, `priority_score`, `social_links` | Leads with phone numbers ready for outreach |
| `phone_sequences_due` (VIEW) | `lead_id`, `business_name`, `city`, `phone_number`, `lead_score` | Leads due for touch 2 based on time delays |
