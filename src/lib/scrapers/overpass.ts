import { incrementSourceHealth } from './base';
import type { ScraperSource } from './base';
import type { ScrapedLead } from '@/types/engine';

const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const DAILY_QUOTA = 1000;

// Simple category → OSM tag mapping
const CATEGORY_TAGS: Record<string, string> = {
  restaurant: 'amenity=restaurant',
  restaurants: 'amenity=restaurant',
  cafe: 'amenity=cafe',
  cafes: 'amenity=cafe',
  bar: 'amenity=bar',
  bars: 'amenity=bar',
  hotel: 'tourism=hotel',
  hotels: 'tourism=hotel',
  shop: 'shop',
  shops: 'shop',
  supermarket: 'shop=supermarket',
  pharmacy: 'amenity=pharmacy',
  hospital: 'amenity=hospital',
  gym: 'leisure=fitness_centre',
  salon: 'shop=hairdresser',
  dentist: 'amenity=dentist',
  school: 'amenity=school',
  bank: 'amenity=bank',
};

function buildOverpassQL(query: string, lat: number, lng: number, radius = 10000): string {
  const raw = query.toLowerCase().trim();
  const tag = CATEGORY_TAGS[raw] ?? `name~"${raw}",i`;
  const [key, val] = tag.includes('=') ? tag.split('=') : [tag, '*'];
  const filter = val === '*' ? `["${key}"]` : `["${key}"="${val}"]`;

  return `[out:json][timeout:25];
(
  node${filter}(around:${radius},${lat},${lng});
  way${filter}(around:${radius},${lat},${lng});
);
out body;
>;
out skel qt;`;
}

export interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function parseOverpassResponse(data: unknown): ScrapedLead[] {
  const elements = (data as { elements?: OsmElement[] }).elements ?? [];
  const leads: ScrapedLead[] = [];

  for (const el of elements) {
    const tags = el.tags;
    if (!tags?.name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    leads.push({
      source: 'overpass',
      external_id: `${el.type}/${el.id}`,
      name: tags.name,
      category: tags.amenity ?? tags.tourism ?? tags.shop ?? tags.leisure ?? null,
      address: [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || null,
      city: tags['addr:city'] ?? null,
      country: tags['addr:country'] ?? null,
      lat: lat ?? null,
      lng: lon ?? null,
      phone: tags.phone ?? tags['contact:phone'] ?? null,
      email: tags.email ?? tags['contact:email'] ?? null,
      website: tags.website ?? tags['contact:website'] ?? null,
      rating: null,
      review_count: null,
      raw_data: tags,
    });
  }

  return leads;
}

// Module-level throttle: 1 req/sec within a single invocation
let lastRequestMs = 0;

async function throttle(): Promise<void> {
  const wait = 1000 - (Date.now() - lastRequestMs);
  if (wait > 0) await new Promise<void>((r) => setTimeout(r, wait));
  lastRequestMs = Date.now();
}

const overpass: ScraperSource = {
  name: 'overpass',
  dailyQuota: DAILY_QUOTA,

  async search(query, _location, opts = {}) {
    const { limit = 50, coords } = opts;
    if (!coords) return [];

    await throttle();

    const ql = buildOverpassQL(query, coords.lat, coords.lng);
    let resp: Response;

    try {
      resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(ql)}`,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await incrementSourceHealth('overpass', false, msg);
      throw err;
    }

    if (!resp.ok) {
      const msg = `Overpass HTTP ${resp.status}`;
      await incrementSourceHealth('overpass', false, msg);
      throw new Error(msg);
    }

    const data: unknown = await resp.json();
    await incrementSourceHealth('overpass', true);
    return parseOverpassResponse(data).slice(0, limit);
  },
};

export default overpass;
