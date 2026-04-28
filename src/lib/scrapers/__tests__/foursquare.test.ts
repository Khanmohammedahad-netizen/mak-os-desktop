import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseFoursquareResponse } from '../foursquare';
import fixture from './fixtures/foursquare-response.json';

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
      insert: async () => ({}),
      update: () => ({ eq: () => ({ eq: async () => ({}) }) }),
    }),
  },
}));

describe('parseFoursquareResponse', () => {
  it('maps Foursquare results to ScrapedLead shape', () => {
    const leads = parseFoursquareResponse(fixture);
    expect(leads).toHaveLength(2);
    const first = leads[0];
    expect(first.source).toBe('foursquare');
    expect(first.external_id).toBe('4b058783f964a520539c22e3');
    expect(first.name).toBe('Hotel Nikhil Grand');
    expect(first.lat).toBeCloseTo(17.378);
    expect(first.lng).toBeCloseTo(78.474);
    expect(first.category).toBe('Restaurant');
    expect(first.phone).toBe('+91 40 2461 2345');
  });

  it('normalises Foursquare rating from 0-10 to 0-5', () => {
    const leads = parseFoursquareResponse(fixture);
    expect(leads[0].rating).toBeCloseTo(3.9); // 7.8 / 2
    expect(leads[1].rating).toBeCloseTo(4.1); // 8.2 / 2
  });

  it('returns empty array for missing results key', () => {
    expect(parseFoursquareResponse({})).toHaveLength(0);
  });
});

describe('foursquare.search', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it('throws when FOURSQUARE_API_KEY not set', async () => {
    vi.stubEnv('FOURSQUARE_API_KEY', '');
    const { default: fsq } = await import('../foursquare');
    await expect(fsq.search('restaurants', 'Hyderabad')).rejects.toThrow('FOURSQUARE_API_KEY');
  });

  it('returns parsed leads on success', async () => {
    vi.stubEnv('FOURSQUARE_API_KEY', 'test-key');
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(fixture), { status: 200 })
    );
    const { default: fsq } = await import('../foursquare');
    const leads = await fsq.search('restaurants', 'Hyderabad');
    expect(leads).toHaveLength(2);
  });
});
