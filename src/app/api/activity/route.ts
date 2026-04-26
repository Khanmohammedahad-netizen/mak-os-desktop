import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entity_type = searchParams.get('entity_type');
    const entity_id = searchParams.get('entity_id');

    let query = supabase
      .from('mak_activity_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (entity_type) {
      query = query.eq('entity_type', entity_type);
    }

    if (entity_id) {
      query = query.eq('entity_id', entity_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
