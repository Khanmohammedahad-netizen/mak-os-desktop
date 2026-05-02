import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockOverpassSearch,
  mockYelpSearch,
  mockHereSearch,
  mockFoursquareSearch,
  mockGooglePlacesSearch,
  mockGetSourceHealth,
} = vi.hoisted(() => ({
  mockOverpassSearch: vi.fn(),
  mockYelpSearch: vi.fn(),
  mockHereSearch: vi.fn(),
  mockFoursquareSearch: vi.fn(),
  mockGooglePlacesSearch: vi.fn(),
  mockGetSourceHealth: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: () => ({ upsert: async () => ({ data: null, error: null }) }),
  },
}));

vi.mock('../base', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../base')>();
  return { ...actual, getSourceHealth: mockGetSourceHealth };
});

vi.mock('../overpass', () => ({
  default: { name: 'overpass', dailyQuota: 1000, search: mockOverpassSearch },
}));
vi.mock('../yelp', () => ({
  default: { name: 'yelp', dailyQuota: 5000, search: mockYelpSearch },
}));
vi.mock('../here', () => ({
  default: { name: 'here', dailyQuota: 8300, search: mockHereSearch },
}));
vi.mock('../foursquare', () => ({
  default: { name: 'foursquare', dailyQuota: 1000, search: mockFoursquareSearch },
}));
vi.mock('../google-places', () => ({
  default: { name: 'google-places', dailyQuota: 9999, search: mockGooglePlacesSearch },
}));

import { scrapeLeads } from '../orchestrator';
import type { ScrapedLead } from '@/types/engine';

let _idCounter = 0;
function makeLead(overrides: Partial<ScrapedLead> = {}): ScrapedLead {
  return {
    source: 'overpass',
    external_id: `node/${++_idCounter}`,
    name: 'Test Place',
    lat: 17.385,
    lng: 78.4867,
    ...overrides,
  };
}

// Factory — Response body can only be read once; never share an instance across tests
function nominatimHit() {
  return new Response(JSON.stringify([{ lat: '17.385', lon: '78.4867' }]), { status: 200 });
}

describe('scrapeLeads', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetSourceHealth.mockResolvedValue(null);
    vi.spyOn(global, 'fetch').mockImplementation(async () => nominatimHit());
  });

  it('returns leads from primary source when sufficient', async () => {
    const leads = [makeLead({ name: 'A' }), makeLead({ name: 'B' })];
    mockOverpassSearch.mockResolvedValue(leads);
    mockYelpSearch.mockResolvedValue([]);
    mockHereSearch.mockResolvedValue([]);
    mockFoursquareSearch.mockResolvedValue([]);
    mockGooglePlacesSearch.mockResolvedValue([]);

    const result = await scrapeLeads('restaurant', 'Hyderabad', 2);
    expect(result.leads).toHaveLength(2);
    expect(result.sources_used).toContain('overpass');
    expect(result.leads_per_source['overpass']).toBe(2);
  });

  it('deduplicates same name + coords within 50m', async () => {
    const a = makeLead({ name: 'Cafe X', source: 'overpass', lat: 17.385, lng: 78.4867 });
    const b = makeLead({ name: 'Cafe X', source: 'yelp', lat: 17.38501, lng: 78.48671 }); // ~1m away
    mockOverpassSearch.mockResolvedValue([a]);
    mockYelpSearch.mockResolvedValue([b]);
    mockHereSearch.mockResolvedValue([]);
    mockFoursquareSearch.mockResolvedValue([]);
    mockGooglePlacesSearch.mockResolvedValue([]);

    const result = await scrapeLeads('cafe', 'Hyderabad', 10);
    expect(result.leads).toHaveLength(1);
  });

  it('deduplicates same name + null coords', async () => {
    const a = makeLead({ name: 'Shop Y', lat: undefined, lng: undefined });
    const b = makeLead({ name: 'Shop Y', source: 'yelp', lat: undefined, lng: undefined });
    mockOverpassSearch.mockResolvedValue([a]);
    mockYelpSearch.mockResolvedValue([b]);
    mockHereSearch.mockResolvedValue([]);
    mockFoursquareSearch.mockResolvedValue([]);
    mockGooglePlacesSearch.mockResolvedValue([]);

    const result = await scrapeLeads('shop', 'Hyderabad', 10);
    expect(result.leads).toHaveLength(1);
  });

  it('keeps distinct leads with same name but far apart (>50m)', async () => {
    const a = makeLead({ name: 'Pizza', lat: 17.385, lng: 78.4867 });
    const b = makeLead({ name: 'Pizza', source: 'yelp', lat: 17.4, lng: 78.5 }); // ~2.5km
    mockOverpassSearch.mockResolvedValue([a]);
    mockYelpSearch.mockResolvedValue([b]);
    mockHereSearch.mockResolvedValue([]);
    mockFoursquareSearch.mockResolvedValue([]);
    mockGooglePlacesSearch.mockResolvedValue([]);

    const result = await scrapeLeads('pizza', 'Hyderabad', 10);
    expect(result.leads).toHaveLength(2);
  });

  it('skips source that hit daily quota', async () => {
    mockGetSourceHealth.mockImplementation(async (source: string) =>
      source === 'overpass' ? { requests_made: 1000, requests_failed: 0 } : null
    );
    const lead = makeLead({ source: 'yelp' });
    mockYelpSearch.mockResolvedValue([lead]);
    mockHereSearch.mockResolvedValue([]);
    mockFoursquareSearch.mockResolvedValue([]);
    mockGooglePlacesSearch.mockResolvedValue([]);

    const result = await scrapeLeads('restaurant', 'Hyderabad', 1);
    expect(mockOverpassSearch).not.toHaveBeenCalled();
    expect(result.sources_used).toContain('yelp');
    expect(result.leads).toHaveLength(1);
  });

  it('circuit-breaks source with 3+ failures today', async () => {
    mockGetSourceHealth.mockImplementation(async (source: string) =>
      source === 'overpass' ? { requests_made: 5, requests_failed: 3 } : null
    );
    const lead = makeLead({ source: 'yelp' });
    mockYelpSearch.mockResolvedValue([lead]);
    mockHereSearch.mockResolvedValue([]);
    mockFoursquareSearch.mockResolvedValue([]);
    mockGooglePlacesSearch.mockResolvedValue([]);

    const result = await scrapeLeads('restaurant', 'Hyderabad', 1);
    expect(mockOverpassSearch).not.toHaveBeenCalled();
    expect(result.sources_used).toContain('yelp');
  });

  it('skips throwing source and tries next', async () => {
    mockOverpassSearch.mockRejectedValue(new Error('Network error'));
    const lead = makeLead({ source: 'yelp' });
    mockYelpSearch.mockResolvedValue([lead]);
    mockHereSearch.mockResolvedValue([]);
    mockFoursquareSearch.mockResolvedValue([]);
    mockGooglePlacesSearch.mockResolvedValue([]);

    const result = await scrapeLeads('restaurant', 'Hyderabad', 5);
    expect(result.leads).toHaveLength(1);
    expect(result.sources_used).not.toContain('overpass');
    expect(result.sources_used).toContain('yelp');
  });

  it('stops early when target is reached', async () => {
    const batch = Array.from({ length: 5 }, (_, i) =>
      makeLead({ name: `Place ${i}` })
    );
    mockOverpassSearch.mockResolvedValue(batch);
    // yelp should never be called because target=5 is met by overpass alone
    mockYelpSearch.mockResolvedValue([makeLead({ source: 'yelp', name: 'Extra' })]);
    mockHereSearch.mockResolvedValue([]);
    mockFoursquareSearch.mockResolvedValue([]);
    mockGooglePlacesSearch.mockResolvedValue([]);

    const result = await scrapeLeads('restaurant', 'Hyderabad', 5);
    expect(result.leads).toHaveLength(5);
    expect(mockYelpSearch).not.toHaveBeenCalled();
  });

  it('aggregates leads_per_source across multiple sources', async () => {
    const aLeads = [makeLead({ name: 'A' }), makeLead({ name: 'B' })];
    const bLeads = [makeLead({ name: 'C', source: 'yelp' })];
    mockOverpassSearch.mockResolvedValue(aLeads);
    mockYelpSearch.mockResolvedValue(bLeads);
    mockHereSearch.mockResolvedValue([]);
    mockFoursquareSearch.mockResolvedValue([]);
    mockGooglePlacesSearch.mockResolvedValue([]);

    const result = await scrapeLeads('restaurant', 'Hyderabad', 10);
    expect(result.leads_per_source['overpass']).toBe(2);
    expect(result.leads_per_source['yelp']).toBe(1);
    expect(result.sources_used).toEqual(['overpass', 'yelp']);
  });

  it('returns empty result when all sources fail', async () => {
    for (const mock of [mockOverpassSearch, mockYelpSearch, mockHereSearch, mockFoursquareSearch, mockGooglePlacesSearch]) {
      mock.mockRejectedValue(new Error('fail'));
    }

    const result = await scrapeLeads('restaurant', 'Hyderabad', 10);
    expect(result.leads).toHaveLength(0);
    expect(result.sources_used).toHaveLength(0);
    expect(result.leads_per_source).toEqual({});
  });
});
