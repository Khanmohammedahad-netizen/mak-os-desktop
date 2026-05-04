import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('api_settings')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    // Convert array to key-value object
    const settings = data.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('api_settings')
      .upsert({ 
        key, 
        value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update setting:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
