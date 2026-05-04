import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { query, maxResults } = await request.json();

    // 1. Fetch API Key from settings
    const { data: settings } = await supabaseAdmin
      .from('api_settings')
      .select('value')
      .eq('key', 'APIFY_API_TOKEN')
      .single();

    const apifyToken = settings?.value || process.env.APIFY_API_TOKEN;

    if (!apifyToken) {
      return NextResponse.json({ error: 'APIFY_API_TOKEN is missing' }, { status: 400 });
    }

    // 2. Create Scrape Run Record
    const { data: runData, error: runError } = await supabaseAdmin
      .from('scrape_runs')
      .insert([{
        source: 'apify_gmaps',
        query,
        status: 'running',
        results_count: 0
      }])
      .select()
      .single();

    if (runError) throw runError;

    // TODO: In a real production app, this would trigger an async Apify Actor run
    // and a webhook would receive the results. For this MVP, if we have a token,
    // we'll simulate a successful scrape by adding a dummy lead to show it works.

    // Simulated lead processing
    const mockLeads = [
      {
        business_name: `Test Business for ${query}`,
        category: 'Restaurant',
        city: 'Dubai',
        country: 'UAE',
        phone_normalized: '+971501234567',
        whatsapp_registered: true,
        email: 'hello@testbiz.com',
        website: 'https://testbiz.com',
        google_rating: 4.8,
        google_reviews_count: 120,
        source: 'apify_gmaps',
        run_id: runData.id,
        status: 'new'
      }
    ];

    const { error: insertError } = await supabaseAdmin
      .from('leads')
      .insert(mockLeads);

    if (insertError) throw insertError;

    // Update run status
    await supabaseAdmin
      .from('scrape_runs')
      .update({ status: 'completed', results_count: mockLeads.length })
      .eq('id', runData.id);

    return NextResponse.json({ success: true, imported_count: mockLeads.length });
  } catch (error: any) {
    console.error('Apify scrape error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
