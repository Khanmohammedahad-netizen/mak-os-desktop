import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockLookupWhatsApp = vi.fn()
vi.mock('../twilio', () => ({ lookupWhatsApp: mockLookupWhatsApp }))

const mockSupabaseChain = {
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  maybeSingle: vi.fn(),
}
mockSupabaseChain.from.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.gte.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.maybeSingle.mockResolvedValue({ data: null, error: null })

vi.mock('@/lib/supabase-server', () => ({ createClient: () => mockSupabaseChain }))

type Contact = {
  id: string
  phone: string
  email: string
  country: string
  marketing_consent: boolean | null
}

const UAE_CONTACT: Contact = {
  id: 'c2', phone: '+971501234567', email: 'dubai@example.com',
  country: 'uae', marketing_consent: null,
}
const EU_CONTACT: Contact = {
  id: 'c1', phone: '+447911123456', email: 'uk@example.com',
  country: 'uk', marketing_consent: null,
}
const CONSENTED_EU: Contact = { ...EU_CONTACT, id: 'c3', marketing_consent: true }

describe('assertNotInDNC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseChain.from.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.gte.mockReturnValue(mockSupabaseChain)
  })

  it('passes when contact not in DNC list', async () => {
    mockSupabaseChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { assertNotInDNC } = await import('../compliance')
    await expect(assertNotInDNC('c1')).resolves.toBeUndefined()
  })

  it('throws ComplianceError with code DNC when contact blocked', async () => {
    mockSupabaseChain.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'dnc1' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'dnc1' }, error: null })
    const { assertNotInDNC, ComplianceError } = await import('../compliance')
    await expect(assertNotInDNC('c1')).rejects.toThrow(ComplianceError)
    await expect(assertNotInDNC('c1')).rejects.toMatchObject({ code: 'DNC' })
  })
})

describe('assertWhatsAppRegistered', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes when phone is WhatsApp registered', async () => {
    mockLookupWhatsApp.mockResolvedValueOnce(true)
    const { assertWhatsAppRegistered } = await import('../compliance')
    await expect(assertWhatsAppRegistered('+971501234567')).resolves.toBeUndefined()
  })

  it('throws ComplianceError with code NOT_WHATSAPP when not registered', async () => {
    mockLookupWhatsApp.mockResolvedValueOnce(false)
    const { assertWhatsAppRegistered, ComplianceError } = await import('../compliance')
    await expect(assertWhatsAppRegistered('+971501234567')).rejects.toThrow(ComplianceError)
    await expect(assertWhatsAppRegistered('+971501234567')).rejects.toMatchObject({ code: 'NOT_WHATSAPP' })
  })
})

describe('assertWithin24hReplyWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseChain.from.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.gte.mockReturnValue(mockSupabaseChain)
  })

  it('passes when inbound message exists within last 24h', async () => {
    mockSupabaseChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'log1' }, error: null })
    const { assertWithin24hReplyWindow } = await import('../compliance')
    await expect(assertWithin24hReplyWindow('c1')).resolves.toBeUndefined()
  })

  it('throws ComplianceError with code NO_REPLY_WINDOW when no inbound in 24h', async () => {
    mockSupabaseChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { assertWithin24hReplyWindow, ComplianceError } = await import('../compliance')
    await expect(assertWithin24hReplyWindow('c1')).rejects.toThrow(ComplianceError)
    await expect(assertWithin24hReplyWindow('c1')).rejects.toMatchObject({ code: 'NO_REPLY_WINDOW' })
  })
})

describe('assertGdprCompliant', () => {
  it('passes for non-EU/UK contact regardless of consent', async () => {
    const { assertGdprCompliant } = await import('../compliance')
    await expect(assertGdprCompliant(UAE_CONTACT)).resolves.toBeUndefined()
  })

  it('throws GDPR_NO_CONSENT for UK contact without consent', async () => {
    const { assertGdprCompliant, ComplianceError } = await import('../compliance')
    await expect(assertGdprCompliant(EU_CONTACT)).rejects.toThrow(ComplianceError)
    await expect(assertGdprCompliant(EU_CONTACT)).rejects.toMatchObject({ code: 'GDPR_NO_CONSENT' })
  })

  it('passes for UK contact with marketing_consent=true', async () => {
    const { assertGdprCompliant } = await import('../compliance')
    await expect(assertGdprCompliant(CONSENTED_EU)).resolves.toBeUndefined()
  })

  it('throws for EU country codes (de, fr, nl)', async () => {
    const { assertGdprCompliant, ComplianceError } = await import('../compliance')
    const de: Contact = { ...EU_CONTACT, id: 'c4', country: 'de', marketing_consent: null }
    await expect(assertGdprCompliant(de)).rejects.toMatchObject({ code: 'GDPR_NO_CONSENT' })
  })
})

describe('gateOutbound', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseChain.from.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.gte.mockReturnValue(mockSupabaseChain)
    mockSupabaseChain.maybeSingle.mockResolvedValue({ data: null, error: null })
  })

  it('passes for valid UAE WhatsApp template send (not freeform)', async () => {
    mockSupabaseChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null }) // DNC miss
    mockLookupWhatsApp.mockResolvedValueOnce(true)
    const { gateOutbound } = await import('../compliance')
    await expect(gateOutbound({ contact: UAE_CONTACT, channel: 'whatsapp', freeform: false })).resolves.toBeUndefined()
  })

  it('blocks at DNC check before WhatsApp lookup', async () => {
    mockSupabaseChain.maybeSingle.mockResolvedValueOnce({ data: { id: 'dnc1' }, error: null })
    const { gateOutbound } = await import('../compliance')
    await expect(gateOutbound({ contact: UAE_CONTACT, channel: 'whatsapp' })).rejects.toMatchObject({ code: 'DNC' })
    expect(mockLookupWhatsApp).not.toHaveBeenCalled()
  })

  it('blocks UK contact without consent for email channel', async () => {
    mockSupabaseChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null }) // DNC miss
    const { gateOutbound } = await import('../compliance')
    await expect(gateOutbound({ contact: EU_CONTACT, channel: 'email' })).rejects.toMatchObject({ code: 'GDPR_NO_CONSENT' })
  })

  it('requires 24h window check for freeform WhatsApp', async () => {
    mockSupabaseChain.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // DNC miss
      .mockResolvedValueOnce({ data: null, error: null }) // no inbound in 24h
    mockLookupWhatsApp.mockResolvedValueOnce(true)
    const { gateOutbound } = await import('../compliance')
    await expect(gateOutbound({ contact: UAE_CONTACT, channel: 'whatsapp', freeform: true })).rejects.toMatchObject({ code: 'NO_REPLY_WINDOW' })
  })
})
