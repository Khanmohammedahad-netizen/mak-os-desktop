import { NextRequest, NextResponse } from 'next/server';
import overpass from '@/lib/scrapers/overpass';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // see IMPROVEMENTS.md — upgrade to 300 on Pro plan

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      query?: string;
      location?: string;
      lat?: number;
      lng?: number;
      limit?: number;
    };
    const { query, location, lat, lng, limit = 50 } = body;
    if (!query || !location) {
      return NextResponse.json({ error: 'query and location required' }, { status: 400 });
    }

    const coords = lat != null && lng != null ? { lat, lng } : undefined;
    const leads = await overpass.search(query, location, { limit, coords });
    return NextResponse.json({ leads, count: leads.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
