import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get('stage');

    let query = supabase
      .from('mak_deals')
      .select('*, mak_contacts(name, company)')
      .order('updated_at', { ascending: false });

    if (stage && stage !== 'all') {
      query = query.eq('stage', stage);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = await supabase
      .from('mak_deals')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    await logActivity('deal', data.id, 'created', { title: data.title, value: data.value });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
