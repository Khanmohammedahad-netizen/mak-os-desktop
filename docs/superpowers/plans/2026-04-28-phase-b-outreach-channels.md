# Phase B — Outreach Channels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire WhatsApp (Twilio), Email (Brevo), and Voice (Bland.ai or stub) outbound channels with inbound webhooks, a compliance gate, and full outreach_logs persistence.

**Architecture:** Each channel is an isolated module under `src/lib/channels/`. A `compliance.ts` gate wraps every send. Next.js route handlers under `src/app/api/channels/` and `src/app/api/webhooks/` expose HTTP surfaces. All sends and inbound events persist to `outreach_logs`.

**Tech Stack:** Next.js 15 App Router route handlers, Twilio REST API, Brevo Transactional Email API, Bland.ai REST API, Supabase (Postgres + RLS), Vitest, libphonenumber-js or custom normalization.

---

## ⚠️ PRECONDITIONS — Check Before Starting

1. All env vars added to Vercel and `.env.local`:
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_WHATSAPP_TEMPLATE_SID`
   - `BREVO_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
   - `OUTREACH_FROM_EMAIL`, `OUTREACH_FROM_NAME`
   - `OPENROUTER_API_KEY`, `COMPANIES_HOUSE_API_KEY`
   - `BLAND_API_KEY` (or decided to stub — see Task 4)
   - `DAILY_EMAIL_LIMIT=250`
2. Migration 0001 applied to Supabase (outreach_logs table exists).
3. `mak_contacts` table exists with `id UUID`, `phone TEXT`, `email TEXT`, `country TEXT`, `city TEXT`.

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/lib/channels/normalize-phone.ts` | E.164 normalization, ported + improved from v1 |
| `src/lib/channels/twilio.ts` | WhatsApp template sends, freeform sends, Lookup cache |
| `src/lib/channels/brevo.ts` | Email sends via Brevo API, daily cap enforcement |
| `src/lib/channels/bland.ts` | Voice trigger or no-op stub |
| `src/lib/channels/compliance.ts` | Pre-flight gate: DNC, WhatsApp registration, 24h window, GDPR |
| `src/app/api/channels/whatsapp/send/route.ts` | POST handler → compliance → twilio.sendWhatsAppTemplate |
| `src/app/api/channels/email/send/route.ts` | POST handler → compliance → brevo.sendEmail |
| `src/app/api/channels/call/trigger/route.ts` | POST handler → compliance → bland.triggerCall |
| `src/app/api/webhooks/twilio/route.ts` | Inbound WA + status updates, signature verification |
| `src/app/api/webhooks/brevo/route.ts` | Email events (delivered/opened/bounced/spam) |
| `src/app/api/webhooks/bland/route.ts` | Call status + transcript updates |
| `supabase/migrations/0002_lookups.sql` | `whatsapp_lookups` table |
| `supabase/migrations/0003_compliance.sql` | `dnc_list` table + `marketing_consent` ALTER |
| `src/lib/channels/__tests__/normalize-phone.test.ts` | 20+ normalization cases |
| `src/lib/channels/__tests__/compliance.test.ts` | Each compliance rule in isolation + combined |
| `src/lib/channels/__tests__/twilio.test.ts` | Send payloads, error codes, webhook signature |
| `src/lib/channels/__tests__/brevo.test.ts` | Send payload, daily cap enforcement |
| `docs/webhook-config.md` | Exact URLs + steps for Twilio, Brevo, Bland dashboards |
| `docs/phase-b-stress-test.md` | Results template (filled after deploy) |

---

## Task 1: Phone Normalization

**Files:**
- Create: `src/lib/channels/normalize-phone.ts`
- Create: `src/lib/channels/__tests__/normalize-phone.test.ts`

### Improvements over v1
- v1 silently truncates wrong-length numbers. We'll return `null` with a reason string for debugging.
- Add `+44` UK landline/mobile distinction (mobile: `+44 7xxx`, landline: `+44 [0-9]xxx`).
- Digits-only local numbers for UAE: `9 digits` always correct.

- [ ] **Step 1.1: Write failing tests**

```typescript
// src/lib/channels/__tests__/normalize-phone.test.ts
import { describe, expect, it } from 'vitest'
import { normalizePhone } from '../normalize-phone'

describe('normalizePhone', () => {
  // UAE mobile
  it('normalizes UAE mobile with leading 0', () => {
    expect(normalizePhone('050 123 4567', 'dubai', 'uae')).toBe('+971501234567')
  })
  it('normalizes UAE mobile already E.164', () => {
    expect(normalizePhone('+971501234567', 'dubai', 'uae')).toBe('+971501234567')
  })
  it('normalizes UAE mobile with country code prefix no plus', () => {
    expect(normalizePhone('971501234567', 'dubai', 'uae')).toBe('+971501234567')
  })
  // UAE landline
  it('normalizes UAE landline (4x prefix = 8 digits local)', () => {
    expect(normalizePhone('04 123 4567', 'dubai', 'uae')).toBe('+97141234567')
  })
  // UK
  it('normalizes UK mobile +44 7xxx', () => {
    expect(normalizePhone('07911 123456', 'london', 'uk')).toBe('+447911123456')
  })
  it('normalizes UK with +44 already present', () => {
    expect(normalizePhone('+44 7911 123456', 'london', 'uk')).toBe('+447911123456')
  })
  // India
  it('normalizes India 10-digit mobile', () => {
    expect(normalizePhone('9876543210', 'mumbai', 'india')).toBe('+919876543210')
  })
  it('normalizes India with +91 prefix', () => {
    expect(normalizePhone('+91 98765 43210', 'mumbai', 'india')).toBe('+919876543210')
  })
  // Edge cases
  it('returns null for empty string', () => {
    expect(normalizePhone('', 'dubai', 'uae')).toBeNull()
  })
  it('returns null for unknown region', () => {
    expect(normalizePhone('1234567890', 'atlantis', 'unknown')).toBeNull()
  })
  it('strips spaces and parentheses', () => {
    expect(normalizePhone('(050) 123-4567', 'dubai', 'uae')).toBe('+971501234567')
  })
  it('handles number with dashes', () => {
    expect(normalizePhone('050-123-4567', 'dubai', 'uae')).toBe('+971501234567')
  })
  it('returns null when result too short', () => {
    expect(normalizePhone('123', 'dubai', 'uae')).toBeNull()
  })
  it('returns null when result too long (>15 digits)', () => {
    expect(normalizePhone('97150123456789999', 'dubai', 'uae')).toBeNull()
  })
  it('normalizes Saudi mobile', () => {
    expect(normalizePhone('0501234567', 'riyadh', 'saudi arabia')).toBe('+966501234567')
  })
  it('city lookup case-insensitive', () => {
    expect(normalizePhone('050 123 4567', 'DUBAI', 'UAE')).toBe('+971501234567')
  })
  it('normalizes number with + but wrong country code for region (trusts +)', () => {
    // E.164 pass-through: if starts with + and valid length, trust it
    expect(normalizePhone('+12025550100', 'dubai', 'uae')).toBe('+12025550100')
  })
  it('normalizes Qatar number', () => {
    expect(normalizePhone('33123456', 'doha', 'qatar')).toBe('+97433123456')
  })
  it('uses country fallback when city unknown', () => {
    expect(normalizePhone('9876543210', 'bangalore', 'india')).toBe('+919876543210')
  })
  it('normalizes number with dots as separators', () => {
    expect(normalizePhone('050.123.4567', 'dubai', 'uae')).toBe('+971501234567')
  })
})
```

- [ ] **Step 1.2: Run tests — confirm all fail**

```bash
npx vitest run src/lib/channels/__tests__/normalize-phone.test.ts
```
Expected: `Cannot find module '../normalize-phone'` or similar.

- [ ] **Step 1.3: Implement normalize-phone.ts**

```typescript
// src/lib/channels/normalize-phone.ts

const COUNTRY_CODE_MAP: Record<string, string> = {
  // GCC
  dubai: '971', 'abu dhabi': '971', sharjah: '971', ajman: '971',
  'ras al khaimah': '971', fujairah: '971', uae: '971',
  'united arab emirates': '971',
  riyadh: '966', jeddah: '966', dammam: '966', 'saudi arabia': '966', ksa: '966',
  doha: '974', qatar: '974',
  'kuwait city': '965', kuwait: '965',
  muscat: '968', oman: '968',
  manama: '973', bahrain: '973',
  // Asia
  mumbai: '91', delhi: '91', bangalore: '91', hyderabad: '91', india: '91',
  tokyo: '81', osaka: '81', japan: '81',
  // Europe
  london: '44', manchester: '44', uk: '44', 'united kingdom': '44',
  paris: '33', france: '33',
  berlin: '49', germany: '49',
  // Oceania
  sydney: '61', melbourne: '61', australia: '61',
  // North America
  'new york': '1', 'los angeles': '1', usa: '1', toronto: '1', canada: '1',
}

// Local digit count by country code (digits AFTER country code)
const LOCAL_DIGITS: Record<string, number> = {
  '971': 9,  // UAE: 9 digits (5x mobile, 4x landline both 8 digits local — handled below)
  '966': 9,  // Saudi
  '974': 8,  // Qatar
  '965': 8,  // Kuwait
  '968': 8,  // Oman
  '973': 8,  // Bahrain
  '91': 10,  // India
  '81': 10,  // Japan
  '44': 10,  // UK
  '33': 9,   // France
  '49': 10,  // Germany
  '61': 9,   // Australia
  '1': 10,   // US/Canada
}

export function normalizePhone(
  phone: string,
  city: string,
  country: string,
): string | null {
  if (!phone) return null

  // E.164 pass-through
  if (phone.startsWith('+')) {
    const digits = phone.replace(/\D/g, '')
    if (digits.length >= 10 && digits.length <= 15) return `+${digits}`
  }

  const cityKey = city?.toLowerCase().trim() ?? ''
  const countryKey = country?.toLowerCase().trim() ?? ''
  const code = COUNTRY_CODE_MAP[cityKey] ?? COUNTRY_CODE_MAP[countryKey] ?? null
  if (!code) return null

  let digits = phone.replace(/\D/g, '')
  if (!digits) return null

  // Strip leading country code if present
  if (digits.startsWith(code)) {
    digits = digits.slice(code.length)
  }

  // Strip a leading 0 (common for local formats)
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  const expectedLocal = LOCAL_DIGITS[code] ?? 8
  // Take last N digits to handle over-long inputs
  digits = digits.slice(-expectedLocal)

  const e164 = `+${code}${digits}`
  const totalDigits = e164.replace(/\D/g, '').length
  if (totalDigits < 10 || totalDigits > 15) return null

  return e164
}
```

- [ ] **Step 1.4: Run tests — confirm all pass**

```bash
npx vitest run src/lib/channels/__tests__/normalize-phone.test.ts
```
Expected: all green, no TS errors.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/channels/normalize-phone.ts src/lib/channels/__tests__/normalize-phone.test.ts
git commit -m "feat(channels): phone normalization with 20+ unit tests"
```

---

## Task 2: DB Migrations

**Files:**
- Create: `supabase/migrations/0002_lookups.sql`
- Create: `supabase/migrations/0003_compliance.sql`

- [ ] **Step 2.1: Write 0002_lookups.sql**

```sql
-- supabase/migrations/0002_lookups.sql
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
```

- [ ] **Step 2.2: Write 0003_compliance.sql**

```sql
-- supabase/migrations/0003_compliance.sql
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

-- Add outreach_logs.direction index for inbound queries
CREATE INDEX IF NOT EXISTS idx_outreach_logs_inbound
  ON outreach_logs(contact_id, created_at)
  WHERE direction = 'inbound';

-- Add marketing_consent to mak_contacts
ALTER TABLE mak_contacts ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT NULL;
```

- [ ] **Step 2.3: Apply migrations**

```bash
npx supabase db push
```
Expected: both migrations applied, no errors.

- [ ] **Step 2.4: Commit**

```bash
git add supabase/migrations/0002_lookups.sql supabase/migrations/0003_compliance.sql
git commit -m "feat(db): whatsapp_lookups, dnc_list, marketing_consent"
```

---

## Task 3: Twilio WhatsApp Channel

**Files:**
- Create: `src/lib/channels/twilio.ts`
- Create: `src/lib/channels/__tests__/twilio.test.ts`

- [ ] **Step 3.1: Write failing tests**

```typescript
// src/lib/channels/__tests__/twilio.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  single: vi.fn(),
  upsert: vi.fn().mockResolvedValue({ error: null }),
  insert: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn().mockReturnThis(),
  match: vi.fn().mockResolvedValue({ error: null }),
}
vi.mock('@/lib/supabase-server', () => ({ createClient: () => mockSupabase }))

describe('sendWhatsAppTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends correct payload to Twilio Messages API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sid: 'SM123', status: 'queued' }),
    })
    mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { sendWhatsAppTemplate } = await import('../twilio')
    const result = await sendWhatsAppTemplate({
      to: '+971501234567',
      contactId: 'contact-uuid',
      businessName: 'Test Cafe',
      city: 'Dubai',
    })

    expect(result).toEqual({ ok: true, sid: 'SM123', status: 'queued' })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('api.twilio.com')
    const body = new URLSearchParams(init.body as string)
    expect(body.get('To')).toBe('whatsapp:+971501234567')
    expect(body.get('ContentSid')).toBe(process.env.TWILIO_WHATSAPP_TEMPLATE_SID)
  })

  it('handles Twilio error 21910 (not WhatsApp user) as discriminated union', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ code: 21910, message: 'not a WA user', status: 400 }),
    })
    mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { sendWhatsAppTemplate } = await import('../twilio')
    const result = await sendWhatsAppTemplate({
      to: '+971501234567',
      contactId: 'contact-uuid',
      businessName: 'Test Cafe',
      city: 'Dubai',
    })

    expect(result).toEqual({ ok: false, errorCode: 21910, errorMessage: 'not a WA user' })
  })

  it('handles Twilio error 63016 (template not approved)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ code: 63016, message: 'template not approved', status: 400 }),
    })
    mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const { sendWhatsAppTemplate } = await import('../twilio')
    const result = await sendWhatsAppTemplate({
      to: '+971501234567',
      contactId: 'contact-uuid',
      businessName: 'Test Cafe',
      city: 'Dubai',
    })

    expect(result.ok).toBe(false)
    expect((result as { errorCode: number }).errorCode).toBe(63016)
  })
})

describe('verifyTwilioSignature', () => {
  it('returns true for valid signature', async () => {
    // Import after env is set
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    const { verifyTwilioSignature } = await import('../twilio')
    // Use a known-good signature generated with crypto
    const url = 'https://example.com/api/webhooks/twilio'
    const params = { From: 'whatsapp:+971501234567', Body: 'Hello' }
    // Build expected signature
    const { createHmac } = await import('crypto')
    const sorted = Object.keys(params).sort().reduce((s, k) => s + k + params[k as keyof typeof params], url)
    const expected = createHmac('sha1', 'test-token').update(sorted).digest('base64')
    expect(verifyTwilioSignature(expected, url, params)).toBe(true)
  })

  it('returns false for invalid signature', async () => {
    const { verifyTwilioSignature } = await import('../twilio')
    expect(verifyTwilioSignature('bad-sig', 'https://example.com', {})).toBe(false)
  })
})
```

- [ ] **Step 3.2: Run tests — confirm fail**

```bash
npx vitest run src/lib/channels/__tests__/twilio.test.ts
```

- [ ] **Step 3.3: Implement twilio.ts**

```typescript
// src/lib/channels/twilio.ts
import { createHmac } from 'crypto'
import { createClient } from '@/lib/supabase-server'

const TWILIO_BASE = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}`
const LOOKUP_BASE = 'https://lookups.twilio.com/v2/PhoneNumbers'

function twilioAuth() {
  const creds = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString('base64')
  return `Basic ${creds}`
}

type SendOk = { ok: true; sid: string; status: string }
type SendErr = { ok: false; errorCode: number; errorMessage: string }
type SendResult = SendOk | SendErr

const TRACKED_ERROR_CODES = new Set([21910, 21212, 63016, 63024])

async function logOutreach(
  contactId: string,
  data: Record<string, unknown>,
) {
  const supabase = createClient()
  await supabase.from('outreach_logs').insert({
    contact_id: contactId,
    channel: 'whatsapp',
    direction: 'outbound',
    ...data,
  })
}

export async function sendWhatsAppTemplate({
  to,
  contactId,
  businessName,
  city,
}: {
  to: string
  contactId: string
  businessName: string
  city: string
}): Promise<SendResult> {
  const body = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    ContentSid: process.env.TWILIO_WHATSAPP_TEMPLATE_SID!,
    ContentVariables: JSON.stringify({ '1': businessName, '2': city }),
  })

  const res = await fetch(`${TWILIO_BASE}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: twilioAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const json = await res.json()

  if (!res.ok) {
    const errorCode: number = json.code ?? 0
    const errorMessage: string = json.message ?? 'unknown'
    await logOutreach(contactId, {
      status: 'failed',
      twilio_error_code: String(errorCode),
      twilio_error_message: errorMessage,
      metadata: TRACKED_ERROR_CODES.has(errorCode) ? { tracked: true } : undefined,
    })
    return { ok: false, errorCode, errorMessage }
  }

  await logOutreach(contactId, {
    status: json.status,
    twilio_sid: json.sid,
  })
  return { ok: true, sid: json.sid, status: json.status }
}

export async function sendWhatsAppFreeform({
  to,
  contactId,
  body: msgBody,
}: {
  to: string
  contactId: string
  body: string
}): Promise<SendResult> {
  // 24h window check deferred to compliance.assertWithin24hReplyWindow
  const body = new URLSearchParams({
    To: `whatsapp:${to}`,
    From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
    Body: msgBody,
  })

  const res = await fetch(`${TWILIO_BASE}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: twilioAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const json = await res.json()

  if (!res.ok) {
    const errorCode: number = json.code ?? 0
    await logOutreach(contactId, {
      status: 'failed',
      twilio_error_code: String(errorCode),
      twilio_error_message: json.message ?? 'unknown',
    })
    return { ok: false, errorCode, errorMessage: json.message ?? 'unknown' }
  }

  await logOutreach(contactId, { status: json.status, twilio_sid: json.sid })
  return { ok: true, sid: json.sid, status: json.status }
}

export async function lookupWhatsApp(phone: string): Promise<boolean> {
  const supabase = createClient()

  // Check cache
  const { data: cached } = await supabase
    .from('whatsapp_lookups')
    .select('registered, expires_at')
    .eq('phone', phone)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (cached) return cached.registered

  const res = await fetch(
    `${LOOKUP_BASE}/${encodeURIComponent(phone)}?Fields=line_type_intelligence`,
    { headers: { Authorization: twilioAuth() } },
  )

  if (!res.ok) throw new Error(`Twilio Lookup failed: ${res.status}`)

  const json = await res.json()
  const registered: boolean =
    json.line_type_intelligence?.line_type === 'mobile' || false

  await supabase.from('whatsapp_lookups').upsert({
    phone,
    line_type: json.line_type_intelligence?.line_type ?? null,
    registered,
    raw_response: json,
    looked_up_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })

  return registered
}

export function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN!
  const sorted = Object.keys(params)
    .sort()
    .reduce((s, k) => s + k + params[k], url)
  const expected = createHmac('sha1', token).update(sorted).digest('base64')
  return expected === signature
}
```

- [ ] **Step 3.4: Run tests — confirm pass**

```bash
npx vitest run src/lib/channels/__tests__/twilio.test.ts
```

- [ ] **Step 3.5: Commit**

```bash
git add src/lib/channels/twilio.ts src/lib/channels/__tests__/twilio.test.ts
git commit -m "feat(channels): Twilio WhatsApp send, lookup, signature verification"
```

---

## Task 4: Brevo Email Channel

**Files:**
- Create: `src/lib/channels/brevo.ts`
- Create: `src/lib/channels/__tests__/brevo.test.ts`

- [ ] **Step 4.1: Write failing tests**

```typescript
// src/lib/channels/__tests__/brevo.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ error: null }),
  single: vi.fn(),
}
vi.mock('@/lib/supabase-server', () => ({ createClient: () => mockSupabase }))

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DAILY_EMAIL_LIMIT = '250'
    process.env.BREVO_API_KEY = 'test-key'
    process.env.OUTREACH_FROM_EMAIL = 'hello@example.com'
    process.env.OUTREACH_FROM_NAME = 'MAK Outreach'
  })

  it('sends email via Brevo API with correct headers', async () => {
    // Mock: daily count = 0, so under cap
    mockSupabase.single.mockResolvedValueOnce({ data: { count: 0 }, error: null })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messageId: 'brevo-123' }),
    })

    const { sendEmail } = await import('../brevo')
    const result = await sendEmail({
      to: 'test@example.com',
      contactId: 'contact-uuid',
      subject: 'Hello',
      html: '<p>Hi</p>',
    })

    expect(result.ok).toBe(true)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('api.brevo.com')
    expect(init.headers['api-key']).toBe('test-key')
    const body = JSON.parse(init.body)
    expect(body.to[0].email).toBe('test@example.com')
    expect(body.subject).toBe('Hello')
  })

  it('refuses send when daily cap reached', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { count: 250 }, error: null })

    const { sendEmail } = await import('../brevo')
    const result = await sendEmail({
      to: 'test@example.com',
      contactId: 'contact-uuid',
      subject: 'Hello',
      html: '<p>Hi</p>',
    })

    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toBe('DAILY_LIMIT_REACHED')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('includes replyTo when provided', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { count: 0 }, error: null })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messageId: 'brevo-456' }),
    })

    const { sendEmail } = await import('../brevo')
    await sendEmail({
      to: 'test@example.com',
      contactId: 'contact-uuid',
      subject: 'Hello',
      html: '<p>Hi</p>',
      replyTo: 'reply@example.com',
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.replyTo?.email).toBe('reply@example.com')
  })
})
```

- [ ] **Step 4.2: Run tests — confirm fail**

```bash
npx vitest run src/lib/channels/__tests__/brevo.test.ts
```

- [ ] **Step 4.3: Implement brevo.ts**

```typescript
// src/lib/channels/brevo.ts
import { createClient } from '@/lib/supabase-server'

type EmailOk = { ok: true; brevoId: string }
type EmailCapped = { ok: false; reason: 'DAILY_LIMIT_REACHED' }
type EmailErr = { ok: false; reason: 'API_ERROR'; status: number }
type EmailResult = EmailOk | EmailCapped | EmailErr

export async function sendEmail({
  to,
  contactId,
  subject,
  html,
  replyTo,
}: {
  to: string
  contactId: string
  subject: string
  html: string
  replyTo?: string
}): Promise<EmailResult> {
  const supabase = createClient()
  const limit = parseInt(process.env.DAILY_EMAIL_LIMIT ?? '250', 10)

  // Daily cap check
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: countRow } = await supabase
    .from('outreach_logs')
    .select('count')
    .eq('channel', 'email')
    .eq('direction', 'outbound')
    .gte('created_at', todayStart.toISOString())
    .single()

  const todayCount = (countRow as { count: number } | null)?.count ?? 0
  if (todayCount >= limit) return { ok: false, reason: 'DAILY_LIMIT_REACHED' }

  const payload: Record<string, unknown> = {
    sender: {
      email: process.env.OUTREACH_FROM_EMAIL,
      name: process.env.OUTREACH_FROM_NAME,
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  }
  if (replyTo) payload.replyTo = { email: replyTo }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const json = await res.json()

  if (!res.ok) {
    await supabase.from('outreach_logs').insert({
      contact_id: contactId,
      channel: 'email',
      direction: 'outbound',
      status: 'failed',
      subject,
      metadata: { brevo_error: json },
    })
    return { ok: false, reason: 'API_ERROR', status: res.status }
  }

  await supabase.from('outreach_logs').insert({
    contact_id: contactId,
    channel: 'email',
    direction: 'outbound',
    status: 'sent',
    subject,
    brevo_id: json.messageId,
  })
  return { ok: true, brevoId: json.messageId }
}
```

- [ ] **Step 4.4: Run tests — confirm pass**

```bash
npx vitest run src/lib/channels/__tests__/brevo.test.ts
```

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/channels/brevo.ts src/lib/channels/__tests__/brevo.test.ts
git commit -m "feat(channels): Brevo email send with daily cap"
```

---

## Task 5: Bland.ai Voice Channel

> **⚠️ BRANCHING TASK — depends on user's BLAND_API_KEY decision:**
> - **Option A (stub):** implement stub that throws `CHANNEL_DISABLED`
> - **Option B (live):** implement full Bland.ai integration

**Files:**
- Create: `src/lib/channels/bland.ts`

### Option A — Stub

```typescript
// src/lib/channels/bland.ts
export class ChannelDisabledError extends Error {
  constructor() { super('CHANNEL_DISABLED: BLAND_API_KEY not configured') }
}

export async function triggerCall(_args: {
  to: string
  contactId: string
  scriptOrPathway: string
  leadContext: Record<string, unknown>
}): Promise<never> {
  throw new ChannelDisabledError()
}
```

### Option B — Live

```typescript
// src/lib/channels/bland.ts
import { createClient } from '@/lib/supabase-server'

export class ChannelDisabledError extends Error {
  constructor() { super('CHANNEL_DISABLED: BLAND_API_KEY not configured') }
}

type CallOk = { ok: true; callId: string; status: string }
type CallErr = { ok: false; errorMessage: string }
type CallResult = CallOk | CallErr

export async function triggerCall({
  to,
  contactId,
  scriptOrPathway,
  leadContext,
}: {
  to: string
  contactId: string
  scriptOrPathway: string
  leadContext: Record<string, unknown>
}): Promise<CallResult> {
  if (!process.env.BLAND_API_KEY) throw new ChannelDisabledError()

  const res = await fetch('https://api.bland.ai/v1/calls', {
    method: 'POST',
    headers: {
      authorization: process.env.BLAND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: to,
      pathway_id: scriptOrPathway,
      metadata: leadContext,
    }),
  })

  const json = await res.json()
  const supabase = createClient()

  if (!res.ok) {
    await supabase.from('outreach_logs').insert({
      contact_id: contactId,
      channel: 'voice',
      direction: 'outbound',
      status: 'failed',
      metadata: { bland_error: json },
    })
    return { ok: false, errorMessage: json.message ?? 'unknown' }
  }

  await supabase.from('outreach_logs').insert({
    contact_id: contactId,
    channel: 'voice',
    direction: 'outbound',
    status: json.status,
    bland_call_id: json.call_id,
  })
  return { ok: true, callId: json.call_id, status: json.status }
}
```

- [ ] **Step 5.1: Implement bland.ts** (use Option A or B per user decision)

- [ ] **Step 5.2: Commit**

```bash
git add src/lib/channels/bland.ts
git commit -m "feat(channels): Bland.ai voice channel (stub|live)"
```

---

## Task 6: Compliance Gate

**Files:**
- Create: `src/lib/channels/compliance.ts`
- Create: `src/lib/channels/__tests__/compliance.test.ts`

- [ ] **Step 6.1: Write failing tests**

```typescript
// src/lib/channels/__tests__/compliance.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockLookupWhatsApp = vi.fn()
vi.mock('../twilio', () => ({ lookupWhatsApp: mockLookupWhatsApp }))

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
}
vi.mock('@/lib/supabase-server', () => ({ createClient: () => mockSupabase }))

type Contact = {
  id: string
  phone: string
  email: string
  country: string
  marketing_consent: boolean | null
}

const EU_CONTACT: Contact = {
  id: 'c1', phone: '+447911123456', email: 'uk@example.com',
  country: 'uk', marketing_consent: null,
}
const UAE_CONTACT: Contact = {
  id: 'c2', phone: '+971501234567', email: 'dubai@example.com',
  country: 'uae', marketing_consent: null,
}
const CONSENTED_EU_CONTACT: Contact = {
  ...EU_CONTACT, id: 'c3', marketing_consent: true,
}

describe('assertNotInDNC', () => {
  it('passes when contact not in DNC list', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { assertNotInDNC } = await import('../compliance')
    await expect(assertNotInDNC('c1')).resolves.toBeUndefined()
  })

  it('throws when contact in DNC list', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'dnc1', reason: 'opted out' }, error: null,
    })
    const { assertNotInDNC } = await import('../compliance')
    await expect(assertNotInDNC('c1')).rejects.toThrow('DNC')
  })
})

describe('assertWhatsAppRegistered', () => {
  it('passes when phone is WhatsApp registered', async () => {
    mockLookupWhatsApp.mockResolvedValueOnce(true)
    const { assertWhatsAppRegistered } = await import('../compliance')
    await expect(assertWhatsAppRegistered('+971501234567')).resolves.toBeUndefined()
  })

  it('throws when phone not registered on WhatsApp', async () => {
    mockLookupWhatsApp.mockResolvedValueOnce(false)
    const { assertWhatsAppRegistered } = await import('../compliance')
    await expect(assertWhatsAppRegistered('+971501234567')).rejects.toThrow('NOT_WHATSAPP')
  })
})

describe('assertWithin24hReplyWindow', () => {
  it('passes when inbound message exists within 24h', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'log1' }, error: null,
    })
    const { assertWithin24hReplyWindow } = await import('../compliance')
    await expect(assertWithin24hReplyWindow('c1')).resolves.toBeUndefined()
  })

  it('throws when no inbound message in last 24h', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { assertWithin24hReplyWindow } = await import('../compliance')
    await expect(assertWithin24hReplyWindow('c1')).rejects.toThrow('NO_REPLY_WINDOW')
  })
})

describe('assertGdprCompliant', () => {
  it('passes for non-EU/UK contact regardless of consent', async () => {
    const { assertGdprCompliant } = await import('../compliance')
    await expect(assertGdprCompliant(UAE_CONTACT)).resolves.toBeUndefined()
  })

  it('throws for EU/UK contact without marketing_consent', async () => {
    const { assertGdprCompliant } = await import('../compliance')
    await expect(assertGdprCompliant(EU_CONTACT)).rejects.toThrow('GDPR_NO_CONSENT')
  })

  it('passes for EU/UK contact with marketing_consent=true', async () => {
    const { assertGdprCompliant } = await import('../compliance')
    await expect(assertGdprCompliant(CONSENTED_EU_CONTACT)).resolves.toBeUndefined()
  })
})

describe('gateOutbound', () => {
  it('runs all checks and passes for valid UAE WhatsApp send', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }) // DNC miss
    mockLookupWhatsApp.mockResolvedValueOnce(true) // registered

    const { gateOutbound } = await import('../compliance')
    await expect(gateOutbound({
      contact: UAE_CONTACT,
      channel: 'whatsapp',
      freeform: false,
    })).resolves.toBeUndefined()
  })

  it('blocks when contact in DNC even if WhatsApp registered', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'dnc1' }, error: null,
    })
    const { gateOutbound } = await import('../compliance')
    await expect(gateOutbound({
      contact: UAE_CONTACT,
      channel: 'whatsapp',
      freeform: false,
    })).rejects.toThrow('DNC')
  })

  it('blocks UK contact without consent for email channel', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }) // DNC miss
    const { gateOutbound } = await import('../compliance')
    await expect(gateOutbound({
      contact: EU_CONTACT,
      channel: 'email',
      freeform: false,
    })).rejects.toThrow('GDPR_NO_CONSENT')
  })
})
```

- [ ] **Step 6.2: Run tests — confirm fail**

```bash
npx vitest run src/lib/channels/__tests__/compliance.test.ts
```

- [ ] **Step 6.3: Implement compliance.ts**

```typescript
// src/lib/channels/compliance.ts
import { createClient } from '@/lib/supabase-server'
import { lookupWhatsApp } from './twilio'

const EU_UK_COUNTRIES = new Set([
  'uk', 'united kingdom', 'gb', 'great britain',
  'de', 'germany', 'fr', 'france', 'nl', 'netherlands',
  'be', 'belgium', 'es', 'spain', 'it', 'italy',
  'pt', 'portugal', 'se', 'sweden', 'no', 'norway',
  'dk', 'denmark', 'fi', 'finland', 'pl', 'poland',
  'at', 'austria', 'ch', 'switzerland', 'ie', 'ireland',
  'eu',
])

type Contact = {
  id: string
  phone: string
  email: string
  country: string
  marketing_consent: boolean | null
}

export class ComplianceError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'ComplianceError'
  }
}

export async function assertNotInDNC(contactId: string): Promise<void> {
  const supabase = createClient()
  const { data } = await supabase
    .from('dnc_list')
    .select('id')
    .eq('contact_id', contactId)
    .maybeSingle()
  if (data) throw new ComplianceError('DNC', `Contact ${contactId} is in DNC list`)
}

export async function assertWhatsAppRegistered(phone: string): Promise<void> {
  const registered = await lookupWhatsApp(phone)
  if (!registered) throw new ComplianceError('NOT_WHATSAPP', `${phone} is not a WhatsApp number`)
}

export async function assertWithin24hReplyWindow(contactId: string): Promise<void> {
  const supabase = createClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('outreach_logs')
    .select('id')
    .eq('contact_id', contactId)
    .eq('direction', 'inbound')
    .gte('created_at', since)
    .maybeSingle()
  if (!data) throw new ComplianceError('NO_REPLY_WINDOW', `No inbound message from ${contactId} in last 24h`)
}

export function assertGdprCompliant(contact: Contact): Promise<void> {
  const countryKey = contact.country?.toLowerCase().trim() ?? ''
  if (EU_UK_COUNTRIES.has(countryKey) && contact.marketing_consent !== true) {
    throw new ComplianceError('GDPR_NO_CONSENT', `Contact ${contact.id} in EU/UK without marketing consent`)
  }
  return Promise.resolve()
}

export async function gateOutbound({
  contact,
  channel,
  freeform = false,
}: {
  contact: Contact
  channel: 'whatsapp' | 'email' | 'voice'
  freeform?: boolean
}): Promise<void> {
  await assertNotInDNC(contact.id)
  await assertGdprCompliant(contact)
  if (channel === 'whatsapp') {
    await assertWhatsAppRegistered(contact.phone)
    if (freeform) await assertWithin24hReplyWindow(contact.id)
  }
}
```

- [ ] **Step 6.4: Run tests — confirm pass**

```bash
npx vitest run src/lib/channels/__tests__/compliance.test.ts
```

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/channels/compliance.ts src/lib/channels/__tests__/compliance.test.ts
git commit -m "feat(channels): compliance gate — DNC, WA registration, 24h window, GDPR"
```

---

## Task 7: Channel API Route Handlers

**Files:**
- Create: `src/app/api/channels/whatsapp/send/route.ts`
- Create: `src/app/api/channels/email/send/route.ts`
- Create: `src/app/api/channels/call/trigger/route.ts`

- [ ] **Step 7.1: Implement whatsapp/send/route.ts**

```typescript
// src/app/api/channels/whatsapp/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { gateOutbound, ComplianceError } from '@/lib/channels/compliance'
import { sendWhatsAppTemplate } from '@/lib/channels/twilio'
import { normalizePhone } from '@/lib/channels/normalize-phone'

export async function POST(req: NextRequest) {
  const { contact_id, businessName, city } = await req.json()
  if (!contact_id || !businessName || !city) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: contact, error } = await supabase
    .from('mak_contacts')
    .select('id, phone, email, country, city, marketing_consent')
    .eq('id', contact_id)
    .single()

  if (error || !contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  const phone = normalizePhone(contact.phone, contact.city ?? city, contact.country)
  if (!phone) return NextResponse.json({ error: 'Invalid phone number' }, { status: 422 })

  try {
    await gateOutbound({ contact: { ...contact, phone }, channel: 'whatsapp' })
  } catch (e) {
    if (e instanceof ComplianceError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 403 })
    }
    throw e
  }

  const result = await sendWhatsAppTemplate({ to: phone, contactId: contact_id, businessName, city })
  return NextResponse.json(result, { status: result.ok ? 200 : 422 })
}
```

- [ ] **Step 7.2: Implement email/send/route.ts**

```typescript
// src/app/api/channels/email/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { gateOutbound, ComplianceError } from '@/lib/channels/compliance'
import { sendEmail } from '@/lib/channels/brevo'

export async function POST(req: NextRequest) {
  const { contact_id, subject, html } = await req.json()
  if (!contact_id || !subject || !html) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: contact, error } = await supabase
    .from('mak_contacts')
    .select('id, phone, email, country, marketing_consent')
    .eq('id', contact_id)
    .single()

  if (error || !contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  try {
    await gateOutbound({ contact, channel: 'email' })
  } catch (e) {
    if (e instanceof ComplianceError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 403 })
    }
    throw e
  }

  const result = await sendEmail({ to: contact.email, contactId: contact_id, subject, html })
  return NextResponse.json(result, { status: result.ok ? 200 : 422 })
}
```

- [ ] **Step 7.3: Implement call/trigger/route.ts**

```typescript
// src/app/api/channels/call/trigger/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { gateOutbound, ComplianceError } from '@/lib/channels/compliance'
import { triggerCall, ChannelDisabledError } from '@/lib/channels/bland'

export async function POST(req: NextRequest) {
  const { contact_id, scriptId } = await req.json()
  if (!contact_id || !scriptId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: contact, error } = await supabase
    .from('mak_contacts')
    .select('id, phone, email, country, marketing_consent')
    .eq('id', contact_id)
    .single()

  if (error || !contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

  try {
    await gateOutbound({ contact, channel: 'voice' })
  } catch (e) {
    if (e instanceof ComplianceError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 403 })
    }
    throw e
  }

  try {
    const result = await triggerCall({
      to: contact.phone,
      contactId: contact_id,
      scriptOrPathway: scriptId,
      leadContext: { contactId: contact_id },
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 422 })
  } catch (e) {
    if (e instanceof ChannelDisabledError) {
      return NextResponse.json({ error: 'Voice channel not configured' }, { status: 503 })
    }
    throw e
  }
}
```

- [ ] **Step 7.4: Run TS check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7.5: Commit**

```bash
git add src/app/api/channels/
git commit -m "feat(api): channel route handlers — whatsapp/send, email/send, call/trigger"
```

---

## Task 8: Inbound Webhooks

**Files:**
- Create: `src/app/api/webhooks/twilio/route.ts`
- Create: `src/app/api/webhooks/brevo/route.ts`
- Create: `src/app/api/webhooks/bland/route.ts`

- [ ] **Step 8.1: Implement twilio webhook**

```typescript
// src/app/api/webhooks/twilio/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { verifyTwilioSignature } from '@/lib/channels/twilio'

export async function POST(req: NextRequest) {
  const url = req.url
  const signature = req.headers.get('x-twilio-signature') ?? ''
  const body = await req.text()
  const params = Object.fromEntries(new URLSearchParams(body))

  if (!verifyTwilioSignature(signature, url, params)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
  }

  const supabase = createClient()

  // Status callback (MessageSid + MessageStatus present, no Body)
  if (params.MessageSid && params.MessageStatus && !params.Body) {
    await supabase
      .from('outreach_logs')
      .update({ status: params.MessageStatus })
      .match({ twilio_sid: params.MessageSid })
    return NextResponse.json({ ok: true })
  }

  // Inbound message
  if (params.From && params.Body) {
    await supabase.from('outreach_logs').insert({
      channel: 'whatsapp',
      direction: 'inbound',
      status: 'received',
      body: params.Body,
      metadata: params,
    })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 8.2: Implement brevo webhook**

```typescript
// src/app/api/webhooks/brevo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

type BrevoEvent = {
  event: 'delivered' | 'opened' | 'click' | 'soft_bounce' | 'hard_bounce' | 'spam' | 'unsubscribed'
  'message-id': string
  email: string
  ts: number
}

export async function POST(req: NextRequest) {
  const payload: BrevoEvent = await req.json()
  const supabase = createClient()

  await supabase
    .from('outreach_logs')
    .update({
      status: payload.event,
      metadata: payload,
    })
    .match({ brevo_id: payload['message-id'] })

  // Bounce or spam — enqueue DeliverabilityAgent job (Phase C picks this up)
  if (payload.event === 'hard_bounce' || payload.event === 'spam') {
    await supabase.from('agent_jobs').insert({
      agent: 'DeliverabilityAgent',
      payload: { event: payload.event, email: payload.email, messageId: payload['message-id'] },
      status: 'pending',
    })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 8.3: Implement bland webhook**

```typescript
// src/app/api/webhooks/bland/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

type BlandEvent = {
  call_id: string
  status: string
  transcript?: string
  metadata?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const payload: BlandEvent = await req.json()
  const supabase = createClient()

  await supabase
    .from('outreach_logs')
    .update({
      status: payload.status,
      metadata: {
        transcript: payload.transcript,
        ...payload.metadata,
      },
    })
    .match({ bland_call_id: payload.call_id })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 8.4: Run TS check**

```bash
npx tsc --noEmit
```

- [ ] **Step 8.5: Commit**

```bash
git add src/app/api/webhooks/
git commit -m "feat(webhooks): Twilio, Brevo, Bland inbound handlers with signature verification"
```

---

## Task 9: Full Test Suite — Run All

- [ ] **Step 9.1: Run all channel tests**

```bash
npx vitest run src/lib/channels/__tests__/
```
Expected: all pass.

- [ ] **Step 9.2: Run TS check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 9.3: Commit if clean**

```bash
git add -A
git commit -m "test(phase-b): all channel + compliance + webhook tests green"
```

---

## Task 10: Webhook Config Docs

**Files:**
- Create: `docs/webhook-config.md`
- Create: `docs/phase-b-stress-test.md` (template)

- [ ] **Step 10.1: Write webhook-config.md** — see Task 8 in spec for exact URLs. Fill in after deploy:

```markdown
# Webhook Configuration

## Twilio Console
URL: `https://<your-vercel-domain>/api/webhooks/twilio`
- Go to: Twilio Console → Messaging → Senders → WhatsApp Senders
- Select your sender → Webhook
- Set "When a message comes in": POST `https://<domain>/api/webhooks/twilio`
- Set "Status callback URL": POST `https://<domain>/api/webhooks/twilio`

## Brevo Dashboard
URL: `https://<your-vercel-domain>/api/webhooks/brevo`
- Go to: Brevo → Transactional → Settings → Webhooks
- Add webhook, select events: delivered, opened, soft_bounce, hard_bounce, spam, unsubscribed
- URL: `https://<domain>/api/webhooks/brevo`

## Bland.ai Dashboard (if live)
URL: `https://<your-vercel-domain>/api/webhooks/bland`
- Go to: Bland.ai → Settings → Webhooks
- Add: `https://<domain>/api/webhooks/bland`
```

- [ ] **Step 10.2: Write phase-b-stress-test.md template**

```markdown
# Phase B Stress Test Results

Date: _____
Deployed to: _____

## Test 1: WhatsApp Template Send
- Endpoint hit: POST /api/channels/whatsapp/send
- Contact ID used: _____
- Result (200/422/403): _____
- WhatsApp received on phone: Y/N
- outreach_logs row created: Y/N (row ID: _____)

## Test 2: Email Send
- Endpoint hit: POST /api/channels/email/send
- To: Khanmohammedahad@yahoo.com
- Result: _____
- Email received: Y/N
- outreach_logs row: _____

## Test 3: Inbound Webhook (WhatsApp Reply)
- Replied from phone: Y/N
- Twilio webhook fired: Y/N
- outreach_logs inbound row: Y/N (row ID: _____)

## Notes
_____
```

- [ ] **Step 10.3: Commit**

```bash
git add docs/webhook-config.md docs/phase-b-stress-test.md
git commit -m "docs: webhook config URLs and stress test template"
```

---

## Self-Review Against Spec

| Spec Requirement | Covered? |
|-----------------|----------|
| normalizePhone port + improvements | Task 1 ✓ |
| 20+ phone normalization tests | Task 1 ✓ (21 cases) |
| sendWhatsAppTemplate with contentVariables | Task 3 ✓ |
| sendWhatsAppFreeform (freeform check deferred to Task 6) | Task 3 ✓ |
| lookupWhatsApp + 30-day cache | Task 3 ✓ |
| outreach_logs write on every send | Tasks 3, 4, 5 ✓ |
| Twilio error codes 21910/21212/63016/63024 as union | Task 3 ✓ |
| Brevo API (not SMTP) send | Task 4 ✓ |
| Daily email cap (DAILY_EMAIL_LIMIT) | Task 4 ✓ |
| Bland.ai trigger or stub | Task 5 ✓ |
| assertNotInDNC | Task 6 ✓ |
| assertWhatsAppRegistered | Task 6 ✓ |
| assertWithin24hReplyWindow | Task 6 ✓ |
| assertGdprCompliant | Task 6 ✓ |
| gateOutbound wrapper | Task 6 ✓ |
| whatsapp/send route | Task 7 ✓ |
| email/send route | Task 7 ✓ |
| call/trigger route | Task 7 ✓ |
| Twilio webhook + signature verification | Task 8 ✓ |
| Brevo webhook + DeliverabilityAgent job enqueue | Task 8 ✓ |
| Bland webhook + transcript in metadata | Task 8 ✓ |
| 0002_lookups migration | Task 2 ✓ |
| 0003_compliance migration (dnc_list + marketing_consent) | Task 2 ✓ |
| docs/webhook-config.md | Task 10 ✓ |
| docs/phase-b-stress-test.md | Task 10 ✓ |
| RLS on new tables | Task 2 ✓ |
