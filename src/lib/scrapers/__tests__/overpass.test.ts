import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseOverpassResponse } from '../overpass';
import fixture from './fixtures/overpass-response.json';

// Mock supabase-server so health tracking is a no-op
vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
      insert: async () => ({}),
      update: () => ({ eq: () => ({ eq: async () => ({}) }) }),
    }),
  },
}));

describe('parseOverpassResponse', () => {
  it('maps OSM elements to ScrapedLead shape', () => {
    const leads = parseOverpassResponse(fixture);
    expect(leads).toHaveLength(2); // 3rd element has no name tag
    const first = leads[0];
    expect(first.source).toBe('overpass');
    expect(first.external_id).toBe('node/123456789');
    expect(first.name).toBe('Paradise Biryani');
    expect(first.category).toBe('restaurant');
    expect(first.city).toBe('Hyderabad');
    expect(first.lat).toBe(17.385);
    expect(first.lng).toBe(78.4867);
    expect(first.phone).toBe('+91-40-12345678');
    expect(first.website).toBe('https://paradisebiryani.com');
  });

  it('handles way elements using center coordinates', () => {
    const leads = parseOverpassResponse(fixture);
    const way = leads.find((l) => l.external_id === 'way/987654321');
    expect(way).toBeDefined();
    expect(way!.lat).toBe(17.39);
    expect(way!.lng).toBe(78.49);
  });

  it('skips elements without name tag', () => {
    const leads = parseOverpassResponse(fixture);
    expect(leads.every((l) => l.name)).toBe(true);
  });

  it('returns empty array for empty elements', () => {
    expect(parseOverpassResponse({ elements: [] })).toHaveLength(0);
    expect(parseOverpassResponse({})).toHaveLength(0);
  });
});

describe('overpass.search', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('throws when overpass returns non-ok status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Too Many Requests', { status: 429 })
    );
    const { default: overpass } = await import('../overpass');
    await expect(
      overpass.search('restaurant', 'Hyderabad', { coords: { lat: 17.385, lng: 78.4867 } })
    ).rejects.toThrow('Overpass HTTP 429');
  });

  it('returns empty array if no coords supplied', async () => {
    const { default: overpass } = await import('../overpass');
    const results = await overpass.search('restaurant', 'Hyderabad');
    expect(results).toHaveLength(0);
  });

  it('parses fixture data when fetch succeeds', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(fixture), { status: 200 })
    );
    const { default: overpass } = await import('../overpass');
    const leads = await overpass.search('restaurant', 'Hyderabad', {
      coords: { lat: 17.385, lng: 78.4867 },
    });
    expect(leads.length).toBeGreaterThan(0);
    expect(leads[0].source).toBe('overpass');
  });
});
