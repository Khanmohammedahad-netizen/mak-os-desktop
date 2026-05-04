import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const leadId = params.id;
    const updates = await request.json();

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const leadId = params.id;

    const { error } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
