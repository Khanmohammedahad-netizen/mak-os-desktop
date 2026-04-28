import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseHereResponse } from '../here';
import fixture from './fixtures/here-response.json';

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
      insert: async () => ({}),
      update: () => ({ eq: () => ({ eq: async () => ({}) }) }),
    }),
  },
}));

describe('parseHereResponse', () => {
  it('maps HERE items to ScrapedLead shape', () => {
    const leads = parseHereResponse(fixture);
    expect(leads).toHaveLength(2);
    const first = leads[0];
    expect(first.source).toBe('here');
    expect(first.external_id).toBe(
      'here:pds:place:356jx7ps-ba7c2b3748504bbfa048a7c8e9f4a4ef'
    );
    expect(first.name).toBe('Peshawar Restaurant');
    expect(first.city).toBe('Hyderabad');
    expect(first.country).toBe('India');
    expect(first.lat).toBeCloseTo(17.3791);
    expect(first.lng).toBeCloseTo(78.4729);
    expect(first.phone).toBe('+914024751234');
    expect(first.website).toBe('https://peshawar.in');
    expect(first.category).toBe('Restaurant');
  });

  it('handles items with no contacts gracefully', () => {
    const data = { items: [{ ...fixture.items[1], contacts: undefined }] };
    const leads = parseHereResponse(data);
    expect(leads[0].phone).toBeNull();
    expect(leads[0].website).toBeNull();
    expect(leads[0].email).toBeNull();
  });

  it('returns empty array for empty items', () => {
    expect(parseHereResponse({ items: [] })).toHaveLength(0);
    expect(parseHereResponse({})).toHaveLength(0);
  });
});

describe('here.search', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it('throws when HERE_API_KEY not set', async () => {
    vi.stubEnv('HERE_API_KEY', '');
    const { default: hereSource } = await import('../here');
    await expect(hereSource.search('restaurants', 'Hyderabad')).rejects.toThrow('HERE_API_KEY');
  });

  it('returns parsed leads on success', async () => {
    vi.stubEnv('HERE_API_KEY', 'test-key');
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(fixture), { status: 200 })
    );
    const { default: hereSource } = await import('../here');
    const leads = await hereSource.search('restaurants', 'Hyderabad');
    expect(leads).toHaveLength(2);
  });
});
