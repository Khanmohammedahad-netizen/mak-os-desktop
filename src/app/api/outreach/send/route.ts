import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { leadId, channel, content } = await request.json();

    if (!leadId || !channel || !content) {
      return NextResponse.json({ error: 'leadId, channel, and content are required' }, { status: 400 });
    }

    // In a real app, this would integrate with Resend, Twilio, WhatsApp Cloud API, etc.
    // For this MVP, we simulate sending and log it to the database.

    await new Promise(r => setTimeout(r, 1000)); // Simulate network latency

    // 1. Create message log
    const { error: msgError } = await supabaseAdmin
      .from('outreach_messages')
      .insert([{
        lead_id: leadId,
        channel,
        content,
        status: 'sent',
        sent_at: new Date().toISOString()
      }]);

    if (msgError) throw msgError;

    // 2. Update lead status to 'contacted'
    const { error: leadError } = await supabaseAdmin
      .from('leads')
      .update({ status: 'contacted', updated_at: new Date().toISOString() })
      .eq('id', leadId);

    if (leadError) throw leadError;

    // 3. Update daily metrics
    const today = new Date().toISOString().split('T')[0];
    
    // We try to upsert or update daily metrics
    const { data: metrics } = await supabaseAdmin
      .from('daily_metrics')
      .select('*')
      .eq('date', today)
      .single();

    if (metrics) {
      const field = channel === 'email' ? 'emails_sent' : 
                    channel === 'whatsapp' ? 'whatsapp_sent' : 'calls_made';
      await supabaseAdmin
        .from('daily_metrics')
        .update({ [field]: (metrics[field] as number || 0) + 1 })
        .eq('id', metrics.id);
    } else {
      await supabaseAdmin
        .from('daily_metrics')
        .insert([{
          date: today,
          emails_sent: channel === 'email' ? 1 : 0,
          whatsapp_sent: channel === 'whatsapp' ? 1 : 0,
          calls_made: channel === 'call' ? 1 : 0,
          leads_scraped: 0,
          leads_audited: 0,
          replies_received: 0,
          meetings_booked: 0
        }]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
