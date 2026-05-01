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
