-- MAK OS Engine Tables — Phase A
-- Run via: npx supabase db push
-- Or paste into Supabase dashboard SQL editor.

CREATE TABLE IF NOT EXISTS scraped_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  address TEXT, city TEXT, country TEXT,
  lat NUMERIC, lng NUMERIC,
  phone TEXT, email TEXT, website TEXT,
  rating NUMERIC, review_count INTEGER,
  raw_data JSONB,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, external_id)
);

CREATE TABLE IF NOT EXISTS source_health (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  date DATE NOT NULL,
  requests_made INTEGER DEFAULT 0,
  requests_succeeded INTEGER DEFAULT 0,
  requests_failed INTEGER DEFAULT 0,
  daily_quota INTEGER,
  last_error TEXT,
  last_success_at TIMESTAMPTZ,
  UNIQUE(source, date)
);

CREATE TABLE IF NOT EXISTS agent_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  parent_job_id UUID REFERENCES agent_jobs(id),
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agent_jobs_polling ON agent_jobs(status, run_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES agent_jobs(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  event TEXT NOT NULL,
  data JSONB,
  cost_cents NUMERIC(10,4),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES mak_contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  status TEXT,
  subject TEXT, body TEXT,
  whatsapp_registered BOOLEAN,
  twilio_sid TEXT, twilio_error_code TEXT, twilio_error_message TEXT,
  brevo_id TEXT,
  bland_call_id TEXT,
  cost_cents NUMERIC(10,4),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enriched_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES scraped_leads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES mak_contacts(id) ON DELETE CASCADE,
  enrichment_source TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scraped_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE enriched_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_all_scraped_leads ON scraped_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_source_health ON source_health FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_agent_jobs ON agent_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_agent_runs ON agent_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_outreach_logs ON outreach_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all_enriched_data ON enriched_data FOR ALL USING (true) WITH CHECK (true);
