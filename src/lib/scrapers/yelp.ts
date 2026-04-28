import { incrementSourceHealth } from './base';
import type { ScraperSource } from './base';
import type { ScrapedLead } from '@/types/engine';

const BASE_URL = 'https://api.yelp.com/v3/businesses/search';
const DAILY_QUOTA = 5000;

interface YelpBusiness {
  id: string;
  name: string;
  location?: {
    address1?: string;
    city?: string;
    country?: string;
  };
  coordinates?: { latitude?: number; longitude?: number };
  phone?: string;
  url?: string;
  rating?: number;
  review_count?: number;
  categories?: Array<{ alias: string; title: string }>;
}

export function parseYelpResponse(data: unknown): ScrapedLead[] {
  const businesses = (data as { businesses?: YelpBusiness[] }).businesses ?? [];
  return businesses.map((b) => ({
    source: 'yelp',
    external_id: b.id,
    name: b.name,
    category: b.categories?.[0]?.title ?? null,
    address: b.location?.address1 ?? null,
    city: b.location?.city ?? null,
    country: b.location?.country ?? null,
    lat: b.coordinates?.latitude ?? null,
    lng: b.coordinates?.longitude ?? null,
    phone: b.phone || null,
    email: null,
    website: b.url ?? null,
    rating: b.rating ?? null,
    review_count: b.review_count ?? null,
    raw_data: b,
  }));
}

const yelp: ScraperSource = {
  name: 'yelp',
  dailyQuota: DAILY_QUOTA,

  async search(query, location, opts = {}) {
    const apiKey = process.env.YELP_API_KEY;
    if (!apiKey) throw new Error('YELP_API_KEY not set');

    const { limit = 50 } = opts;
    const url = new URL(BASE_URL);
    url.searchParams.set('term', query);
    url.searchParams.set('location', location);
    url.searchParams.set('limit', String(Math.min(limit, 50)));

    let resp: Response;
    try {
      resp = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await incrementSourceHealth('yelp', false, msg);
      throw err;
    }

    if (!resp.ok) {
      const msg = `Yelp HTTP ${resp.status}`;
      await incrementSourceHealth('yelp', false, msg);
      throw new Error(msg);
    }

    const data: unknown = await resp.json();
    await incrementSourceHealth('yelp', true);
    return parseYelpResponse(data).slice(0, limit);
  },
};

export default yelp;
