import { incrementSourceHealth } from './base';
import type { ScraperSource } from './base';
import type { ScrapedLead } from '@/types/engine';

const BASE_URL = 'https://api.foursquare.com/v3/places/search';
const DAILY_QUOTA = 1000;

interface FoursquarePlace {
  fsq_id: string;
  name: string;
  location?: {
    address?: string;
    locality?: string;
    country?: string;
  };
  geocodes?: { main?: { latitude?: number; longitude?: number } };
  categories?: Array<{ name?: string }>;
  tel?: string;
  website?: string;
  rating?: number; // 0–10
}

export function parseFoursquareResponse(data: unknown): ScrapedLead[] {
  const results = (data as { results?: FoursquarePlace[] }).results ?? [];
  return results.map((p) => ({
    source: 'foursquare',
    external_id: p.fsq_id,
    name: p.name,
    category: p.categories?.[0]?.name ?? null,
    address: p.location?.address ?? null,
    city: p.location?.locality ?? null,
    country: p.location?.country ?? null,
    lat: p.geocodes?.main?.latitude ?? null,
    lng: p.geocodes?.main?.longitude ?? null,
    phone: p.tel ?? null,
    email: null,
    website: p.website ?? null,
    rating: p.rating != null ? p.rating / 2 : null, // normalize 0–10 → 0–5
    review_count: null,
    raw_data: p,
  }));
}

const foursquare: ScraperSource = {
  name: 'foursquare',
  dailyQuota: DAILY_QUOTA,

  async search(query, location, opts = {}) {
    const apiKey = process.env.FOURSQUARE_API_KEY;
    if (!apiKey) throw new Error('FOURSQUARE_API_KEY not set');

    const { limit = 50 } = opts;
    const url = new URL(BASE_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('near', location);
    url.searchParams.set('limit', String(Math.min(limit, 50)));
    url.searchParams.set('fields', 'fsq_id,name,location,geocodes,categories,tel,website,rating');

    let resp: Response;
    try {
      resp = await fetch(url.toString(), {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await incrementSourceHealth('foursquare', false, msg);
      throw err;
    }

    if (!resp.ok) {
      const msg = `Foursquare HTTP ${resp.status}`;
      await incrementSourceHealth('foursquare', false, msg);
      throw new Error(msg);
    }

    const data: unknown = await resp.json();
    await incrementSourceHealth('foursquare', true);
    return parseFoursquareResponse(data).slice(0, limit);
  },
};

export default foursquare;
