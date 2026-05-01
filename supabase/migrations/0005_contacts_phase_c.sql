-- supabase/migrations/0005_contacts_phase_c.sql

-- metadata JSONB stores agent-computed data (score, linkedin, etc.)
ALTER TABLE mak_contacts ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Unique index on email for upsert conflict resolution in EnrichmentAgent
-- Partial index: only rows where email IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_mak_contacts_email
  ON mak_contacts(email)
  WHERE email IS NOT NULL;
