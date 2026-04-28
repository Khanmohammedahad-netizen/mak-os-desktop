import { incrementSourceHealth } from './base';
import type { ScraperSource } from './base';
import type { ScrapedLead } from '@/types/engine';

const BASE_URL = 'https://discover.search.hereapi.com/v1/discover';
const DAILY_QUOTA = 2500; // Free tier: 250k monthly = ~8k/day; cap at 2500 to stay safe

interface HereItem {
  id: string;
  title: string;
  address?: {
    label?: string;
    street?: string;
    city?: string;
    countryName?: string;
    countryCode?: string;
  };
  position?: { lat?: number; lng?: number };
  contacts?: Array<{
    phone?: Array<{ value?: string }>;
    www?: Array<{ value?: string }>;
    email?: Array<{ value?: string }>;
  }>;
  categories?: Array<{ name?: string }>;
}

export function parseHereResponse(data: unknown): ScrapedLead[] {
  const items = (data as { items?: HereItem[] }).items ?? [];
  return items.map((item) => {
    const phone = item.contacts?.flatMap((c) => c.phone ?? []).find((p) => p.value)?.value ?? null;
    const website =
      item.contacts?.flatMap((c) => c.www ?? []).find((w) => w.value)?.value ?? null;
    const email =
      item.contacts?.flatMap((c) => c.email ?? []).find((e) => e.value)?.value ?? null;

    return {
      source: 'here',
      external_id: item.id,
      name: item.title,
      category: item.categories?.[0]?.name ?? null,
      address: item.address?.street ?? item.address?.label ?? null,
      city: item.address?.city ?? null,
      country: item.address?.countryName ?? null,
      lat: item.position?.lat ?? null,
      lng: item.position?.lng ?? null,
      phone,
      email,
      website,
      rating: null,
      review_count: null,
      raw_data: item,
    };
  });
}

const here: ScraperSource = {
  name: 'here',
  dailyQuota: DAILY_QUOTA,

  async search(query, location, opts = {}) {
    const apiKey = process.env.HERE_API_KEY;
    if (!apiKey) throw new Error('HERE_API_KEY not set');

    const { limit = 100, coords } = opts;
    const url = new URL(BASE_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(Math.min(limit, 100)));
    url.searchParams.set('apiKey', apiKey);

    if (coords) {
      url.searchParams.set('at', `${coords.lat},${coords.lng}`);
    } else {
      url.searchParams.set('in', `countryCode:${location}`);
    }

    let resp: Response;
    try {
      resp = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await incrementSourceHealth('here', false, msg);
      throw err;
    }

    if (!resp.ok) {
      const msg = `HERE HTTP ${resp.status}`;
      await incrementSourceHealth('here', false, msg);
      throw new Error(msg);
    }

    const data: unknown = await resp.json();
    await incrementSourceHealth('here', true);
    return parseHereResponse(data).slice(0, limit);
  },
};

export default here;
