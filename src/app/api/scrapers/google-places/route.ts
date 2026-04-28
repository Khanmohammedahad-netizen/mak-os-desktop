import { NextRequest, NextResponse } from 'next/server';
import googlePlaces from '@/lib/scrapers/google-places';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { query?: string; location?: string; limit?: number };
    const { query, location, limit = 20 } = body;
    if (!query || !location) {
      return NextResponse.json({ error: 'query and location required' }, { status: 400 });
    }

    const leads = await googlePlaces.search(query, location, { limit });
    return NextResponse.json({ leads, count: leads.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
