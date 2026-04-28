import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseYelpResponse } from '../yelp';
import fixture from './fixtures/yelp-response.json';

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
      insert: async () => ({}),
      update: () => ({ eq: () => ({ eq: async () => ({}) }) }),
    }),
  },
}));

describe('parseYelpResponse', () => {
  it('maps Yelp businesses to ScrapedLead shape', () => {
    const leads = parseYelpResponse(fixture);
    expect(leads).toHaveLength(2);
    const first = leads[0];
    expect(first.source).toBe('yelp');
    expect(first.external_id).toBe('yelp-biz-001');
    expect(first.name).toBe('Spice Garden');
    expect(first.city).toBe('Hyderabad');
    expect(first.lat).toBe(17.4156);
    expect(first.lng).toBe(78.4347);
    expect(first.rating).toBe(4.2);
    expect(first.review_count).toBe(87);
    expect(first.category).toBe('Restaurants');
  });

  it('returns empty array for missing businesses key', () => {
    expect(parseYelpResponse({})).toHaveLength(0);
    expect(parseYelpResponse({ businesses: [] })).toHaveLength(0);
  });

  it('handles null phone gracefully', () => {
    const data = { businesses: [{ ...fixture.businesses[0], phone: '' }] };
    const leads = parseYelpResponse(data);
    expect(leads[0].phone).toBeNull();
  });
});

describe('yelp.search', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it('throws when YELP_API_KEY not set', async () => {
    vi.stubEnv('YELP_API_KEY', '');
    const { default: yelp } = await import('../yelp');
    await expect(yelp.search('restaurants', 'Hyderabad')).rejects.toThrow('YELP_API_KEY');
  });

  it('throws on non-ok response', async () => {
    vi.stubEnv('YELP_API_KEY', 'test-key');
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Forbidden', { status: 403 })
    );
    const { default: yelp } = await import('../yelp');
    await expect(yelp.search('restaurants', 'Hyderabad')).rejects.toThrow('Yelp HTTP 403');
  });

  it('returns parsed leads on success', async () => {
    vi.stubEnv('YELP_API_KEY', 'test-key');
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(fixture), { status: 200 })
    );
    const { default: yelp } = await import('../yelp');
    const leads = await yelp.search('restaurants', 'Hyderabad');
    expect(leads).toHaveLength(2);
  });
});
