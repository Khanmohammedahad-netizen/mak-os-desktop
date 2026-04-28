import { NextRequest, NextResponse } from 'next/server';
import here from '@/lib/scrapers/here';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      query?: string;
      location?: string;
      lat?: number;
      lng?: number;
      limit?: number;
    };
    const { query, location, lat, lng, limit = 100 } = body;
    if (!query || !location) {
      return NextResponse.json({ error: 'query and location required' }, { status: 400 });
    }

    const coords = lat != null && lng != null ? { lat, lng } : undefined;
    const leads = await here.search(query, location, { limit, coords });
    return NextResponse.json({ leads, count: leads.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
