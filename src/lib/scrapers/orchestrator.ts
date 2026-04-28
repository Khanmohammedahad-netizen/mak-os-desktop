import { supabaseAdmin } from '@/lib/supabase-server';
import { getSourceHealth } from './base';
import overpass from './overpass';
import yelp from './yelp';
import here from './here';
import foursquare from './foursquare';
import googlePlaces from './google-places';
import type { ScraperSource } from './base';
import type { ScrapedLead } from '@/types/engine';

const SOURCES: ScraperSource[] = [overpass, yelp, here, foursquare, googlePlaces];

export interface OrchestrateResult {
  leads: ScrapedLead[];
  sources_used: string[];
  leads_per_source: Record<string, number>;
}

// ─── Geocoding ────────────────────────────────────────────────────────────────

interface NominatimResult {
  lat: string;
  lon: string;
}

async function geocode(location: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'MAK-OS/1.0 (Khanmohammedahad@yahoo.com)' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as NominatimResult[];
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isDuplicate(candidate: ScrapedLead, existing: ScrapedLead[]): boolean {
  const name = candidate.name.toLowerCase().trim();
  return existing.some((e) => {
    if (e.name.toLowerCase().trim() !== name) return false;
    const hasCoords =
      candidate.lat != null &&
      candidate.lng != null &&
      e.lat != null &&
      e.lng != null;
    if (!hasCoords) return true; // same name, no coords — treat as duplicate
    return haversineMeters(candidate.lat!, candidate.lng!, e.lat!, e.lng!) <= 50;
  });
}

// ─── Source availability ──────────────────────────────────────────────────────

async function isAvailable(source: ScraperSource): Promise<boolean> {
  const health = await getSourceHealth(source.name);
  if (!health) return true;
  if (health.requests_made >= source.dailyQuota) return false;
  if (health.requests_failed >= 3) return false; // circuit-break after 3 failures today
  return true;
}

// ─── DB upsert ────────────────────────────────────────────────────────────────

async function upsertLeads(leads: ScrapedLead[]): Promise<void> {
  if (!leads.length) return;
  const rows = leads.map(({ id: _id, scraped_at: _ts, ...rest }) => rest);
  await supabaseAdmin.from('scraped_leads').upsert(rows, {
    onConflict: 'source,external_id',
    ignoreDuplicates: false,
  });
}

// ─── Main orchestrator ────────────────────────────────────────────────────────

export async function scrapeLeads(
  query: string,
  location: string,
  target = 50
): Promise<OrchestrateResult> {
  const coords = await geocode(location);
  const accumulated: ScrapedLead[] = [];
  const sourcesUsed: string[] = [];
  const leadsPerSource: Record<string, number> = {};

  for (const source of SOURCES) {
    if (accumulated.length >= target) break;
    if (!(await isAvailable(source))) continue;

    const remaining = target - accumulated.length;

    let batch: ScrapedLead[] = [];
    try {
      batch = await source.search(query, location, {
        limit: remaining + 20, // fetch a few extra to account for deduplication loss
        coords: coords ?? undefined,
      });
    } catch {
      continue; // source already logged the failure; try next
    }

    const novel = batch.filter((lead) => !isDuplicate(lead, accumulated));
    accumulated.push(...novel);
    if (novel.length > 0) {
      sourcesUsed.push(source.name);
      leadsPerSource[source.name] = novel.length;
    }
  }

  await upsertLeads(accumulated);

  return {
    leads: accumulated,
    sources_used: sourcesUsed,
    leads_per_source: leadsPerSource,
  };
}
