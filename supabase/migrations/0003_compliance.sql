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

-- Index for fast inbound message lookups (used by compliance gate)
CREATE INDEX IF NOT EXISTS idx_outreach_logs_inbound
  ON outreach_logs(contact_id, created_at)
  WHERE direction = 'inbound';

-- Required for GDPR compliance check
ALTER TABLE mak_contacts ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT NULL;
