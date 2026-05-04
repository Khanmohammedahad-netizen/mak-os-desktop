-- 0007_v1_tables.sql
-- Consolidated v1 lead generation system tables
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- ─── Core leads table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    city TEXT,
    country TEXT,
    category TEXT,
    website TEXT,
    status TEXT DEFAULT 'new',
    rating NUMERIC,
    source TEXT,
    opportunity_summary TEXT,
    business_type TEXT,

    -- Enrichment
    enriched_at TIMESTAMPTZ,

    -- Email outreach
    email_status TEXT,
    email_sent_at TIMESTAMPTZ,

    -- WhatsApp outreach
    whatsapp_registered BOOLEAN,
    whatsapp_checked_at TIMESTAMPTZ,
    whatsapp_sent_at TIMESTAMPTZ,
    whatsapp_status TEXT,
    whatsapp_message_sid TEXT,

    -- Follow-up
    contacted_at TIMESTAMPTZ,
    followup_sent_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Outreach log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id),
    business_name TEXT,
    channel TEXT,  -- 'email', 'whatsapp', 'voice', 'sms'
    touch_number INTEGER DEFAULT 1,
    send_status TEXT,
    sent_at TIMESTAMPTZ,
    message_sid TEXT,

    -- WhatsApp-specific
    whatsapp_status TEXT,
    whatsapp_message_sid TEXT,
    whatsapp_message_body TEXT,

    -- Email-specific
    email_subject TEXT,
    email_body TEXT,
    email_opens INTEGER DEFAULT 0,
    email_clicks INTEGER DEFAULT 0,

    -- Reply tracking
    reply_checked_at TIMESTAMPTZ,
    reply_received BOOLEAN DEFAULT false,
    reply_content TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Pipeline runs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'running',
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- ─── Scheduler config ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduler_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduler_enabled BOOLEAN DEFAULT true,
    cities TEXT[] DEFAULT ARRAY['Dallas'],
    daily_email_cap INTEGER DEFAULT 20,
    daily_whatsapp_cap INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── API cost log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_cost_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service TEXT NOT NULL,
    action TEXT,
    estimated_cost_usd NUMERIC DEFAULT 0,
    pipeline_run_id UUID,
    called_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Email suppression list ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_suppression_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    reason TEXT,
    bounced_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Research cache ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS research_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Email warmup tracking ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_warmup_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    emails_sent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_outreach_log_lead ON outreach_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_channel ON outreach_log(channel);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_api_cost_log_called ON api_cost_log(called_at);

-- ─── View: today's cities rotation ──────────────────────────────────
CREATE OR REPLACE VIEW todays_cities AS
SELECT
    ARRAY(
        SELECT unnest(cities)
        FROM scheduler_config
        LIMIT 1
    ) AS cities_today;
