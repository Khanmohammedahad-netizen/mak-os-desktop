import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockSupabaseChain = {
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  insert: vi.fn(),
}
mockSupabaseChain.from.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.gte.mockResolvedValue({ count: 0, error: null })
mockSupabaseChain.insert.mockResolvedValue({ error: null })

vi.mock('@/lib/supabase-server', () => ({
  createClient: () => mockSupabaseChain,
}))

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseChain.from.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.gte.mockResolvedValue({ count: 0, error: null })
    mockSupabaseChain.insert.mockResolvedValue({ error: null })
    process.env.DAILY_EMAIL_LIMIT = '250'
    process.env.BREVO_API_KEY = 'test-key'
    process.env.OUTREACH_FROM_EMAIL = 'hello@example.com'
    process.env.OUTREACH_FROM_NAME = 'MAK Outreach'
  })

  it('sends email via Brevo API with correct payload and headers', async () => {
    mockSupabaseChain.gte.mockResolvedValueOnce({ count: 0, error: null })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messageId: 'brevo-123' }),
    })

    const { sendEmail } = await import('../brevo')
    const result = await sendEmail({
      to: 'test@example.com',
      contactId: 'contact-uuid',
      subject: 'Hello from MAK',
      html: '<p>Hi there</p>',
    })

    expect(result).toEqual({ ok: true, brevoId: 'brevo-123' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(init.headers['api-key']).toBe('test-key')
    const body = JSON.parse(init.body)
    expect(body.to[0].email).toBe('test@example.com')
    expect(body.subject).toBe('Hello from MAK')
    expect(body.sender.email).toBe('hello@example.com')
    expect(body.sender.name).toBe('MAK Outreach')
  })

  it('refuses send when at daily cap (count === limit)', async () => {
    mockSupabaseChain.gte.mockResolvedValueOnce({ count: 250, error: null })

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

  it('refuses send when over daily cap (count > limit)', async () => {
    mockSupabaseChain.gte.mockResolvedValueOnce({ count: 300, error: null })

    const { sendEmail } = await import('../brevo')
    const result = await sendEmail({
      to: 'test@example.com',
      contactId: 'contact-uuid',
      subject: 'Hello',
      html: '<p>Hi</p>',
    })

    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toBe('DAILY_LIMIT_REACHED')
  })

  it('includes replyTo in payload when provided', async () => {
    mockSupabaseChain.gte.mockResolvedValueOnce({ count: 0, error: null })
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

  it('omits replyTo when not provided', async () => {
    mockSupabaseChain.gte.mockResolvedValueOnce({ count: 0, error: null })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messageId: 'brevo-789' }),
    })

    const { sendEmail } = await import('../brevo')
    await sendEmail({
      to: 'test@example.com',
      contactId: 'contact-uuid',
      subject: 'Hello',
      html: '<p>Hi</p>',
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.replyTo).toBeUndefined()
  })

  it('returns API_ERROR on Brevo API failure', async () => {
    mockSupabaseChain.gte.mockResolvedValueOnce({ count: 0, error: null })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    })

    const { sendEmail } = await import('../brevo')
    const result = await sendEmail({
      to: 'test@example.com',
      contactId: 'contact-uuid',
      subject: 'Hello',
      html: '<p>Hi</p>',
    })

    expect(result.ok).toBe(false)
    expect((result as { reason: string }).reason).toBe('API_ERROR')
  })
})
