import { z } from 'zod';

// ─── ScrapedLead ──────────────────────────────────────────────────────────────

export const ScrapedLeadSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  external_id: z.string(),
  name: z.string(),
  category: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  review_count: z.number().int().nullable().optional(),
  raw_data: z.unknown().nullable().optional(),
  scraped_at: z.string().optional(),
});

export type ScrapedLead = z.infer<typeof ScrapedLeadSchema>;

// ─── SourceHealth ─────────────────────────────────────────────────────────────

export const SourceHealthSchema = z.object({
  id: z.string().optional(),
  source: z.string(),
  date: z.string(),
  requests_made: z.number().int().default(0),
  requests_succeeded: z.number().int().default(0),
  requests_failed: z.number().int().default(0),
  daily_quota: z.number().int().nullable().optional(),
  last_error: z.string().nullable().optional(),
  last_success_at: z.string().nullable().optional(),
});

export type SourceHealth = z.infer<typeof SourceHealthSchema>;

// ─── AgentJob ─────────────────────────────────────────────────────────────────

export const AgentJobStatusSchema = z.enum(['pending', 'running', 'done', 'failed', 'cancelled']);
export type AgentJobStatus = z.infer<typeof AgentJobStatusSchema>;

export const AgentJobSchema = z.object({
  id: z.string().optional(),
  agent: z.string(),
  payload: z.record(z.string(), z.unknown()),
  status: AgentJobStatusSchema.default('pending'),
  attempts: z.number().int().default(0),
  max_attempts: z.number().int().default(3),
  run_at: z.string().optional(),
  locked_until: z.string().nullable().optional(),
  parent_job_id: z.string().nullable().optional(),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type AgentJob = z.infer<typeof AgentJobSchema>;

// ─── AgentRun ─────────────────────────────────────────────────────────────────

export const AgentRunSchema = z.object({
  id: z.string().optional(),
  job_id: z.string().nullable().optional(),
  agent: z.string(),
  event: z.string(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  cost_cents: z.number().nullable().optional(),
  duration_ms: z.number().int().nullable().optional(),
  created_at: z.string().optional(),
});

export type AgentRun = z.infer<typeof AgentRunSchema>;

// ─── OutreachLog ──────────────────────────────────────────────────────────────

export const OutreachChannelSchema = z.enum(['email', 'whatsapp', 'sms', 'call', 'linkedin']);
export const OutreachDirectionSchema = z.enum(['outbound', 'inbound']);

export const OutreachLogSchema = z.object({
  id: z.string().optional(),
  contact_id: z.string().nullable().optional(),
  channel: OutreachChannelSchema,
  direction: OutreachDirectionSchema,
  status: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  whatsapp_registered: z.boolean().nullable().optional(),
  twilio_sid: z.string().nullable().optional(),
  twilio_error_code: z.string().nullable().optional(),
  twilio_error_message: z.string().nullable().optional(),
  brevo_id: z.string().nullable().optional(),
  bland_call_id: z.string().nullable().optional(),
  cost_cents: z.number().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.string().optional(),
});

export type OutreachLog = z.infer<typeof OutreachLogSchema>;

// ─── EnrichedData ─────────────────────────────────────────────────────────────

export const EnrichedDataSchema = z.object({
  id: z.string().optional(),
  lead_id: z.string().nullable().optional(),
  contact_id: z.string().nullable().optional(),
  enrichment_source: z.string(),
  data: z.record(z.string(), z.unknown()),
  created_at: z.string().optional(),
});

export type EnrichedData = z.infer<typeof EnrichedDataSchema>;
