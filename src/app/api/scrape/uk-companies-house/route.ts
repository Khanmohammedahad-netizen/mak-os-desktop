import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { query, incorporatedAfter } = await request.json();

    // 1. Fetch API Key from settings
    const { data: settings } = await supabaseAdmin
      .from('api_settings')
      .select('value')
      .eq('key', 'COMPANIES_HOUSE_API_KEY')
      .single();

    const chToken = settings?.value || process.env.COMPANIES_HOUSE_API_KEY;

    if (!chToken) {
      return NextResponse.json({ error: 'COMPANIES_HOUSE_API_KEY is missing' }, { status: 400 });
    }

    // 2. Create Scrape Run Record
    const { data: runData, error: runError } = await supabaseAdmin
      .from('scrape_runs')
      .insert([{
        source: 'companies_house',
        query: `${query} | ${incorporatedAfter}`,
        status: 'running',
        results_count: 0
      }])
      .select()
      .single();

    if (runError) throw runError;

    // Simulated lead processing
    const mockLeads = [
      {
        business_name: `UK Corp for ${query}`,
        category: 'Software',
        city: 'London',
        country: 'UK',
        phone_normalized: '+447911123456',
        whatsapp_registered: false,
        email: 'info@ukcorp.co.uk',
        website: 'https://ukcorp.co.uk',
        google_rating: null,
        google_reviews_count: 0,
        source: 'companies_house',
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
    console.error('Companies House search error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
