-- MAK OS Desktop — Supabase Schema (Phase 2)
-- Run this in the Supabase SQL editor.
-- gen_random_uuid() is built into Postgres 13+ — no extension needed.

-- ─── Contacts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mak_contacts (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  company             TEXT,
  website             TEXT,
  source              TEXT DEFAULT 'manual',
  status              TEXT DEFAULT 'new',
  category            TEXT,
  country             TEXT,
  city                TEXT,
  notes               TEXT,
  last_contacted_at   TIMESTAMPTZ,
  next_follow_up_at   TIMESTAMPTZ,
  deal_value          NUMERIC(12,2),
  tags                TEXT[],
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Deals ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mak_deals (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id          UUID REFERENCES mak_contacts(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  value               NUMERIC(12,2),
  currency            TEXT DEFAULT 'USD',
  stage               TEXT DEFAULT 'lead',
  probability         INTEGER DEFAULT 10,
  expected_close_date DATE,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notes ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mak_notes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT,
  folder      TEXT DEFAULT 'general',
  pinned      BOOLEAN DEFAULT FALSE,
  tags        TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tasks ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mak_tasks (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title               TEXT NOT NULL,
  description         TEXT,
  status              TEXT DEFAULT 'todo',
  priority            TEXT DEFAULT 'medium',
  due_date            DATE,
  linked_contact_id   UUID REFERENCES mak_contacts(id) ON DELETE SET NULL,
  linked_deal_id      UUID REFERENCES mak_deals(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Activity Log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mak_activity_log (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  action       TEXT NOT NULL,
  details      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE mak_contacts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mak_deals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mak_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mak_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE mak_activity_log ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon key — lock these down with auth in production
CREATE POLICY "Allow all on mak_contacts"     ON mak_contacts     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on mak_deals"        ON mak_deals        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on mak_notes"        ON mak_notes        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on mak_tasks"        ON mak_tasks        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on mak_activity_log" ON mak_activity_log FOR ALL USING (true) WITH CHECK (true);
