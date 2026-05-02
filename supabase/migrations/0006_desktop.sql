-- supabase/migrations/0006_desktop.sql
-- Desktop app tables: contacts, deals, notes, tasks, activity
-- Column names match TypeScript types in src/types/index.ts

CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  website text,
  source text DEFAULT 'manual',
  status text DEFAULT 'new',
  category text,
  country text,
  city text,
  notes text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  deal_value numeric,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  value numeric DEFAULT 0,
  currency text DEFAULT 'USD',
  stage text DEFAULT 'Lead',
  probability integer DEFAULT 0,
  expected_close_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT 'Untitled',
  content text DEFAULT '',
  folder text DEFAULT 'General',
  pinned boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks use linked_contact_id / linked_deal_id to match TypeScript Task type
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo' CHECK (status IN ('todo','in-progress','done')),
  priority text DEFAULT 'medium' CHECK (priority IN ('urgent','high','medium','low')),
  due_date timestamptz,
  linked_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  linked_deal_id uuid REFERENCES deals(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activity log matches ActivityLog TypeScript type
CREATE TABLE IF NOT EXISTS activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open" ON contacts;
CREATE POLICY "open" ON contacts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open" ON deals;
CREATE POLICY "open" ON deals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open" ON notes;
CREATE POLICY "open" ON notes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open" ON tasks;
CREATE POLICY "open" ON tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open" ON activity;
CREATE POLICY "open" ON activity FOR ALL USING (true) WITH CHECK (true);
