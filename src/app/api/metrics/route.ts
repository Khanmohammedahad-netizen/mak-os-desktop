import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('daily_metrics')
      .select('*')
      .gte('date', pastDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
