import { NextRequest, NextResponse } from 'next/server';
import { scrapeLeads } from '@/lib/scrapers/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // see IMPROVEMENTS.md

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      query?: string;
      location?: string;
      target?: number;
    };
    const { query, location, target = 50 } = body;
    if (!query || !location) {
      return NextResponse.json({ error: 'query and location required' }, { status: 400 });
    }

    const result = await scrapeLeads(query, location, target);
    return NextResponse.json({
      count: result.leads.length,
      sources_used: result.sources_used,
      leads_per_source: result.leads_per_source,
      leads: result.leads,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
