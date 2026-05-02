CREATE TABLE IF NOT EXISTS dnc_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES mak_contacts(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dnc_list ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all_dnc_list ON dnc_list FOR ALL USING (true) WITH CHECK (true);

-- Add missing columns to outreach_logs if table pre-existed from v1
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES mak_contacts(id) ON DELETE SET NULL;
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS twilio_sid TEXT;
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS brevo_id TEXT;
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS bland_call_id TEXT;
ALTER TABLE outreach_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Index for fast inbound message lookups (used by compliance gate)
CREATE INDEX IF NOT EXISTS idx_outreach_logs_inbound
  ON outreach_logs(contact_id, created_at)
  WHERE direction = 'inbound';

-- Required for GDPR compliance check
ALTER TABLE mak_contacts ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT NULL;
