import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('outreach_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { error } = await supabaseAdmin
      .from('outreach_templates')
      .insert(body);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to create template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('outreach_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('outreach_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
