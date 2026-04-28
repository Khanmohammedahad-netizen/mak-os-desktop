import { NextRequest, NextResponse } from 'next/server';
import foursquare from '@/lib/scrapers/foursquare';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { query?: string; location?: string; limit?: number };
    const { query, location, limit = 50 } = body;
    if (!query || !location) {
      return NextResponse.json({ error: 'query and location required' }, { status: 400 });
    }

    const leads = await foursquare.search(query, location, { limit });
    return NextResponse.json({ leads, count: leads.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
