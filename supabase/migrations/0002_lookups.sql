CREATE TABLE IF NOT EXISTS whatsapp_lookups (
  phone TEXT PRIMARY KEY,
  line_type TEXT,
  registered BOOLEAN NOT NULL,
  raw_response JSONB,
  looked_up_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

ALTER TABLE whatsapp_lookups ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all_whatsapp_lookups ON whatsapp_lookups FOR ALL USING (true) WITH CHECK (true);
