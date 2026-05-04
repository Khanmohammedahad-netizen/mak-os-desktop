import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabaseAdmin
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const leadData = await request.json();

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([{
        ...leadData,
        source: 'manual',
        status: 'new'
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
