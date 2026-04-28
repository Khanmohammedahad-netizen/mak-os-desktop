import { incrementSourceHealth } from './base';
import type { ScraperSource } from './base';
import type { ScrapedLead } from '@/types/engine';

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const DAILY_QUOTA = 2500; // $200 credit ≈ ~2500 Text Search requests at $0.08 each

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.addressComponents',
].join(',');

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  addressComponents?: Array<{
    longText?: string;
    types?: string[];
  }>;
}

function extractAddressComponent(
  components: GooglePlace['addressComponents'],
  type: string
): string | null {
  return components?.find((c) => c.types?.includes(type))?.longText ?? null;
}

export function parseGooglePlacesResponse(data: unknown): ScrapedLead[] {
  const places = (data as { places?: GooglePlace[] }).places ?? [];
  return places.map((p) => ({
    source: 'google-places',
    external_id: p.id ?? crypto.randomUUID(),
    name: p.displayName?.text ?? 'Unknown',
    category: p.types?.[0] ?? null,
    address: p.formattedAddress ?? null,
    city: extractAddressComponent(p.addressComponents, 'locality'),
    country: extractAddressComponent(p.addressComponents, 'country'),
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    phone: p.nationalPhoneNumber ?? null,
    email: null,
    website: p.websiteUri ?? null,
    rating: p.rating ?? null,
    review_count: p.userRatingCount ?? null,
    raw_data: p,
  }));
}

const googlePlaces: ScraperSource = {
  name: 'google-places',
  dailyQuota: DAILY_QUOTA,

  async search(query, location, opts = {}) {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set');

    const { limit = 20 } = opts;
    const textQuery = `${query} in ${location}`;

    let resp: Response;
    try {
      resp = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({ textQuery, maxResultCount: Math.min(limit, 20) }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await incrementSourceHealth('google-places', false, msg);
      throw err;
    }

    if (!resp.ok) {
      const msg = `Google Places HTTP ${resp.status}`;
      await incrementSourceHealth('google-places', false, msg);
      throw new Error(msg);
    }

    const data: unknown = await resp.json();
    await incrementSourceHealth('google-places', true);
    return parseGooglePlacesResponse(data).slice(0, limit);
  },
};

export default googlePlaces;
