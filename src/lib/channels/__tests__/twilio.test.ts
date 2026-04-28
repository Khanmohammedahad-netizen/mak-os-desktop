import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockSupabaseChain = {
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  gt: vi.fn(),
  single: vi.fn(),
  upsert: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  match: vi.fn(),
}
// Make each method return `this` for chaining, overriding specific terminal calls
mockSupabaseChain.from.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.gt.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.update.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.match.mockResolvedValue({ error: null })
mockSupabaseChain.upsert.mockResolvedValue({ error: null })
mockSupabaseChain.insert.mockResolvedValue({ error: null })

vi.mock('@/lib/supabase-server', () => ({
  createClient: () => mockSupabaseChain,
}))

describe('sendWhatsAppTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseChain.from.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.gt.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.update.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.match.mockResolvedValue({ error: null })
    mockSupabaseChain.upsert.mockResolvedValue({ error: null })
    mockSupabaseChain.insert.mockResolvedValue({ error: null })
    process.env.TWILIO_ACCOUNT_SID = 'ACtest'
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
    process.env.TWILIO_WHATSAPP_FROM = '+15005550006'
    process.env.TWILIO_WHATSAPP_TEMPLATE_SID = 'HX123'
    // No lookup cache
    mockSupabaseChain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
  })

  it('sends correct payload to Twilio Messages API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sid: 'SM123', status: 'queued' }),
    })

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
    expect(url).toContain('ACtest')
    const body = new URLSearchParams(init.body as string)
    expect(body.get('To')).toBe('whatsapp:+971501234567')
    expect(body.get('From')).toBe('whatsapp:+15005550006')
    expect(body.get('ContentSid')).toBe('HX123')
    const vars = JSON.parse(body.get('ContentVariables')!)
    expect(vars['1']).toBe('Test Cafe')
    expect(vars['2']).toBe('Dubai')
  })

  it('returns discriminated union for error 21910 (not a WA user)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ code: 21910, message: 'not a WA user', status: 400 }),
    })

    const { sendWhatsAppTemplate } = await import('../twilio')
    const result = await sendWhatsAppTemplate({
      to: '+971501234567',
      contactId: 'contact-uuid',
      businessName: 'Test Cafe',
      city: 'Dubai',
    })

    expect(result).toEqual({ ok: false, errorCode: 21910, errorMessage: 'not a WA user' })
  })

  it('returns discriminated union for error 63016 (template not approved)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ code: 63016, message: 'template not approved', status: 400 }),
    })

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

  it('returns discriminated union for error 21212', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ code: 21212, message: 'invalid phone', status: 400 }),
    })

    const { sendWhatsAppTemplate } = await import('../twilio')
    const result = await sendWhatsAppTemplate({
      to: '+971501234567',
      contactId: 'contact-uuid',
      businessName: 'Test Cafe',
      city: 'Dubai',
    })

    expect(result).toEqual({ ok: false, errorCode: 21212, errorMessage: 'invalid phone' })
  })

  it('returns discriminated union for error 63024', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ code: 63024, message: 'rate limited', status: 429 }),
    })

    const { sendWhatsAppTemplate } = await import('../twilio')
    const result = await sendWhatsAppTemplate({
      to: '+971501234567',
      contactId: 'contact-uuid',
      businessName: 'Test Cafe',
      city: 'Dubai',
    })

    expect(result.ok).toBe(false)
  })
})

describe('verifyTwilioSignature', () => {
  beforeEach(() => {
    process.env.TWILIO_AUTH_TOKEN = 'test-token'
  })

  it('returns true for valid HMAC-SHA1 signature', async () => {
    const { verifyTwilioSignature } = await import('../twilio')
    const url = 'https://example.com/api/webhooks/twilio'
    const params = { From: 'whatsapp:+971501234567', Body: 'Hello' }
    const sorted = Object.keys(params).sort().reduce((s, k) => s + k + params[k as keyof typeof params], url)
    const expected = createHmac('sha1', 'test-token').update(sorted).digest('base64')
    expect(verifyTwilioSignature(expected, url, params)).toBe(true)
  })

  it('returns false for invalid signature', async () => {
    const { verifyTwilioSignature } = await import('../twilio')
    expect(verifyTwilioSignature('bad-sig', 'https://example.com', {})).toBe(false)
  })

  it('returns false for empty signature', async () => {
    const { verifyTwilioSignature } = await import('../twilio')
    expect(verifyTwilioSignature('', 'https://example.com', {})).toBe(false)
  })
})
