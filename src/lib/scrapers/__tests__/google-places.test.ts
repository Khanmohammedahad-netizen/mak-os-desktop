import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseGooglePlacesResponse } from '../google-places';
import fixture from './fixtures/google-places-response.json';

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
      insert: async () => ({}),
      update: () => ({ eq: () => ({ eq: async () => ({}) }) }),
    }),
  },
}));

describe('parseGooglePlacesResponse', () => {
  it('maps Google Places to ScrapedLead shape', () => {
    const leads = parseGooglePlacesResponse(fixture);
    expect(leads).toHaveLength(1);
    const lead = leads[0];
    expect(lead.source).toBe('google-places');
    expect(lead.name).toBe("Ohri's Dum Pukht Jolly NHI Road");
    expect(lead.lat).toBeCloseTo(17.395);
    expect(lead.lng).toBeCloseTo(78.4772);
    expect(lead.rating).toBe(4.3);
    expect(lead.review_count).toBe(1542);
    expect(lead.city).toBe('Hyderabad');
    expect(lead.country).toBe('India');
    expect(lead.category).toBe('restaurant');
  });

  it('returns empty array for empty places', () => {
    expect(parseGooglePlacesResponse({ places: [] })).toHaveLength(0);
    expect(parseGooglePlacesResponse({})).toHaveLength(0);
  });
});

describe('googlePlaces.search', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it('throws when GOOGLE_PLACES_API_KEY not set', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
    const { default: gp } = await import('../google-places');
    await expect(gp.search('restaurants', 'Hyderabad')).rejects.toThrow('GOOGLE_PLACES_API_KEY');
  });

  it('returns parsed leads on success', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-key');
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(fixture), { status: 200 })
    );
    const { default: gp } = await import('../google-places');
    const leads = await gp.search('restaurants', 'Hyderabad');
    expect(leads).toHaveLength(1);
    expect(leads[0].source).toBe('google-places');
  });
});
