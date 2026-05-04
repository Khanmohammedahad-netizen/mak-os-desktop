-- ============================================
-- CLEAN SLATE FOR CLIENT ACQUISITION MODULE
-- ============================================
DROP TABLE IF EXISTS outreach_messages CASCADE;
DROP TABLE IF EXISTS outreach_templates CASCADE;
DROP TABLE IF EXISTS scrape_runs CASCADE;
DROP TABLE IF EXISTS daily_metrics CASCADE;
DROP TABLE IF EXISTS api_settings CASCADE;
DROP TABLE IF EXISTS leads CASCADE;

-- ============================================
-- TABLE 1: leads
-- Central lead storage. Every scraped, imported, or manually added lead lives here.
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'manual', -- 'apify_gmaps', 'uk_companies_house', 'instagram', 'linkedin', 'manual'
  source_id TEXT, -- external ID from source (Google place_id, Companies House number, etc.)
  scrape_batch_id TEXT, -- groups leads from same scrape run

  -- Business info
  business_name TEXT NOT NULL,
  category TEXT, -- 'restaurant', 'cafe', 'clinic', 'real_estate', 'events', 'other'
  niche TEXT DEFAULT 'f_and_b', -- 'f_and_b', 'healthcare', 'real_estate', 'events', 'general'
  
  -- Location
  country TEXT,
  city TEXT,
  area TEXT, -- neighborhood/district
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Contact
  contact_name TEXT,
  contact_role TEXT, -- 'owner', 'manager', 'marketing', 'unknown'
  phone TEXT,
  phone_normalized TEXT, -- E.164 format
  whatsapp_registered BOOLEAN, -- from Twilio Lookup API
  email TEXT,
  website TEXT,
  instagram TEXT,
  linkedin TEXT,

  -- Google Maps data
  google_rating NUMERIC(2,1),
  google_reviews_count INTEGER,
  google_place_id TEXT,

  -- Audit results (populated by audit pipeline)
  audit_completed BOOLEAN DEFAULT false,
  audit_completed_at TIMESTAMPTZ,
  mobile_score INTEGER, -- 0-100 from Lighthouse
  load_time_seconds NUMERIC(4,1),
  has_booking_system BOOLEAN DEFAULT false,
  has_online_menu BOOLEAN DEFAULT false,
  has_whatsapp_button BOOLEAN DEFAULT false,
  has_ssl BOOLEAN DEFAULT true,
  detected_technology TEXT, -- 'wordpress', 'squarespace', 'custom', 'none', etc.
  missing_features TEXT[], -- ARRAY of strings
  audit_screenshot_url TEXT, -- screenshot of their website stored in Supabase Storage

  -- Lead scoring
  lead_score INTEGER DEFAULT 0, -- 0-100, calculated from audit + engagement signals
  score_breakdown JSONB, -- { "no_website": 30, "high_rating": 20, "whatsapp_ready": 15, ... }

  -- Pipeline status
  status TEXT DEFAULT 'new', -- 'new', 'audited', 'contacted', 'replied', 'call_booked', 'proposal_sent', 'negotiating', 'won', 'lost', 'dormant'
  status_changed_at TIMESTAMPTZ DEFAULT now(),
  lost_reason TEXT, -- 'no_budget', 'has_agency', 'not_interested', 'no_response', 'other'
  deal_value NUMERIC(10,2), -- expected deal value in USD

  -- Tags
  tags TEXT[] DEFAULT '{}',
  notes TEXT,

  UNIQUE(source, source_id) -- prevent duplicate imports
);

-- Ensure niche column exists if the table was already created in an earlier partial run
ALTER TABLE leads ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT 'f_and_b';

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_niche ON leads(niche);
CREATE INDEX IF NOT EXISTS idx_leads_country ON leads(country);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- ============================================
-- TABLE 2: outreach_messages
-- Every message sent or queued, across all channels
-- ============================================
CREATE TABLE IF NOT EXISTS outreach_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),

  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Channel
  channel TEXT NOT NULL, -- 'whatsapp', 'email', 'instagram_dm', 'phone_call', 'linkedin_dm', 'loom_video'
  
  -- Message content
  subject TEXT, -- for emails
  body TEXT NOT NULL,
  template_used TEXT, -- which template generated this

  -- Status
  status TEXT DEFAULT 'queued', -- 'queued', 'sent', 'delivered', 'read', 'replied', 'failed', 'bounced'
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  failed_reason TEXT,

  -- External IDs
  twilio_sid TEXT, -- Twilio message SID
  brevo_message_id TEXT,
  resend_id TEXT,

  -- Sequence tracking
  sequence_step INTEGER DEFAULT 1, -- 1 = first touch, 2 = follow-up 1, 3 = follow-up 2, etc.
  sequence_type TEXT DEFAULT 'initial', -- 'initial', 'follow_up_nudge', 'follow_up_value', 'follow_up_final', 'reply'

  -- Reply content (when they respond)
  reply_body TEXT,
  reply_sentiment TEXT, -- 'interested', 'not_interested', 'question', 'angry', 'neutral'
  reply_classified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outreach_lead ON outreach_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_messages(status);
CREATE INDEX IF NOT EXISTS idx_outreach_channel ON outreach_messages(channel);
CREATE INDEX IF NOT EXISTS idx_outreach_sent ON outreach_messages(sent_at);

-- ============================================
-- TABLE 3: outreach_templates
-- Reusable message templates with variables
-- ============================================
CREATE TABLE IF NOT EXISTS outreach_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  name TEXT NOT NULL, -- 'whatsapp_no_website', 'email_bad_mobile', etc.
  channel TEXT NOT NULL, -- 'whatsapp', 'email', 'instagram_dm'
  niche TEXT DEFAULT 'f_and_b',
  
  subject_template TEXT, -- for emails, with {{variables}}
  body_template TEXT NOT NULL, -- with {{business_name}}, {{contact_name}}, {{mobile_score}}, etc.
  
  -- Performance tracking
  times_used INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  reply_rate NUMERIC(5,2) DEFAULT 0, -- percentage

  is_active BOOLEAN DEFAULT true
);

-- Ensure niche column exists if the table was already created in an earlier partial run
ALTER TABLE outreach_templates ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT 'f_and_b';

-- ============================================
-- TABLE 4: scrape_runs
-- Track each scraping batch for deduplication and auditing
-- ============================================
CREATE TABLE IF NOT EXISTS scrape_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  source TEXT NOT NULL, -- 'apify_gmaps', 'uk_companies_house'
  query TEXT NOT NULL, -- search query used
  region TEXT, -- 'dubai', 'london', 'riyadh'
  
  raw_count INTEGER DEFAULT 0, -- total results from source
  qualified_count INTEGER DEFAULT 0, -- after filtering
  duplicate_count INTEGER DEFAULT 0, -- already existed
  imported_count INTEGER DEFAULT 0, -- newly added to leads table
  
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  completed_at TIMESTAMPTZ,
  error TEXT
);

-- ============================================
-- TABLE 5: daily_metrics
-- Aggregated daily stats for the analytics dashboard
-- ============================================
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  
  leads_scraped INTEGER DEFAULT 0,
  leads_qualified INTEGER DEFAULT 0,
  leads_audited INTEGER DEFAULT 0,
  
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_read INTEGER DEFAULT 0,
  replies_received INTEGER DEFAULT 0,
  
  calls_booked INTEGER DEFAULT 0,
  proposals_sent INTEGER DEFAULT 0,
  deals_won INTEGER DEFAULT 0,
  revenue_closed NUMERIC(10,2) DEFAULT 0,

  -- Channel breakdown
  whatsapp_sent INTEGER DEFAULT 0,
  email_sent INTEGER DEFAULT 0,
  instagram_sent INTEGER DEFAULT 0,
  calls_made INTEGER DEFAULT 0,

  -- Reply rates
  whatsapp_reply_rate NUMERIC(5,2) DEFAULT 0,
  email_reply_rate NUMERIC(5,2) DEFAULT 0,
  instagram_reply_rate NUMERIC(5,2) DEFAULT 0
);

-- ============================================
-- TABLE 6: api_settings
-- Store API keys and configuration (encrypted at app level)
-- ============================================
CREATE TABLE IF NOT EXISTS api_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  key TEXT NOT NULL UNIQUE, -- 'apify_token', 'twilio_sid', 'twilio_auth', 'twilio_whatsapp_from', 'brevo_api_key', 'resend_api_key', 'openrouter_api_key', 'companies_house_api_key'
  value TEXT NOT NULL, -- encrypted value
  is_active BOOLEAN DEFAULT true
);

-- Seed default outreach templates
INSERT INTO outreach_templates (name, channel, niche, body_template) VALUES
('whatsapp_no_website', 'whatsapp', 'f_and_b', 'Hi {{contact_name}} — I came across {{business_name}} on Google Maps. You have {{google_reviews_count}} reviews at {{google_rating}} stars but no website listed.

Restaurants in {{area}} with online booking get 30-40% more reservations. Want me to show you what a site for {{business_name}} could look like? I can send a free mockup in 24 hours.'),

('whatsapp_bad_mobile', 'whatsapp', 'f_and_b', 'Hi {{contact_name}} — I checked {{business_name}}''s website on mobile and it scored {{mobile_score}}/100 for speed. Google penalizes slow sites in local search rankings.

I build fast, modern restaurant sites with built-in booking. Here''s one I did recently: https://wool-cup-cafe.vercel.app. Worth a 5-min call this week?'),

('whatsapp_no_booking', 'whatsapp', 'f_and_b', 'Hi {{contact_name}} — noticed {{business_name}} doesn''t have online booking on your site. Many of your competitors in {{area}} already do.

I can add a booking system to your existing site in under a week. Interested in seeing how it would look?'),

('email_audit_findings', 'email', 'f_and_b', 'Hi {{contact_name}},

I ran a quick audit on {{website}} and found:
- Mobile speed score: {{mobile_score}}/100 (Google recommends 90+)
- {{missing_feature_1}}
- {{missing_feature_2}}

I build modern websites specifically for restaurants in {{city}}. Here''s a recent project: https://wool-cup-cafe.vercel.app

Would a 10-minute call this week make sense? I can walk you through exactly what I''d change and what it would cost.

Ahad Khan
MAK Software Solutions
maksoftwaresolutions.com'),

('instagram_dm_linktree', 'instagram_dm', 'f_and_b', 'Your food content is amazing but you''re sending people to a Linktree? A proper website with your menu + booking would convert way more of your followers into customers. I do this specifically for restaurants — want to see examples?'),

('follow_up_nudge', 'whatsapp', 'f_and_b', 'Hi {{contact_name}}, just checking if you saw my message about {{business_name}}''s online presence. Happy to chat whenever works for you.'),

('follow_up_value', 'email', 'f_and_b', 'Hi {{contact_name}},

Following up — I put together a quick audit of {{business_name}}''s digital presence compared to competitors in {{area}}. A few things stood out.

If you''d like me to send over the full report (free, no strings), just reply and I''ll share it.

Ahad Khan
MAK Software Solutions'),

('follow_up_final', 'whatsapp', 'f_and_b', 'No worries if now isn''t the right time for {{business_name}}. I''ll leave you with a free audit of your site. Feel free to reach out whenever you''re ready to upgrade your digital presence. — Ahad, MAK Software Solutions')

ON CONFLICT DO NOTHING;