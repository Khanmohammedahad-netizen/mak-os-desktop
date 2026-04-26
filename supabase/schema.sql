-- MAK OS Desktop — Supabase Schema
-- Run this in the Supabase SQL editor to create all required tables.

create extension if not exists "uuid-ossp";

-- ─── Contacts ────────────────────────────────────────────────────────────────
create table if not exists mak_contacts (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  email               text,
  phone               text,
  company             text,
  website             text,
  source              text not null default 'Manual',
  status              text not null default 'New',
  category            text,
  country             text,
  city                text,
  notes               text,
  last_contacted_at   timestamptz,
  next_follow_up_at   timestamptz,
  deal_value          numeric default 0,
  tags                text[],
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Deals ───────────────────────────────────────────────────────────────────
create table if not exists mak_deals (
  id                  uuid primary key default uuid_generate_v4(),
  contact_id          uuid references mak_contacts(id) on delete set null,
  title               text not null,
  value               numeric not null default 0,
  currency            text not null default 'USD',
  stage               text not null default 'Lead',
  probability         integer not null default 10
                        check (probability >= 0 and probability <= 100),
  expected_close_date date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Notes ───────────────────────────────────────────────────────────────────
create table if not exists mak_notes (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null default 'Untitled Note',
  content     text,
  folder      text not null default 'Notes',
  pinned      boolean not null default false,
  tags        text[],
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Tasks ───────────────────────────────────────────────────────────────────
create table if not exists mak_tasks (
  id                  uuid primary key default uuid_generate_v4(),
  title               text not null,
  description         text,
  status              text not null default 'todo'
                        check (status in ('todo', 'in-progress', 'done')),
  priority            text not null default 'medium'
                        check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date            timestamptz,
  linked_contact_id   uuid references mak_contacts(id) on delete set null,
  linked_deal_id      uuid references mak_deals(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── Activity Log ─────────────────────────────────────────────────────────────
create table if not exists mak_activity_log (
  id           uuid primary key default uuid_generate_v4(),
  entity_type  text not null,
  entity_id    uuid not null,
  action       text not null,
  details      jsonb,
  created_at   timestamptz not null default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Enable RLS on all tables
alter table mak_contacts     enable row level security;
alter table mak_deals        enable row level security;
alter table mak_notes        enable row level security;
alter table mak_tasks        enable row level security;
alter table mak_activity_log enable row level security;

-- Permissive policies for anon key — lock these down with auth in production
create policy "Allow all" on mak_contacts     for all using (true) with check (true);
create policy "Allow all" on mak_deals        for all using (true) with check (true);
create policy "Allow all" on mak_notes        for all using (true) with check (true);
create policy "Allow all" on mak_tasks        for all using (true) with check (true);
create policy "Allow all" on mak_activity_log for all using (true) with check (true);
