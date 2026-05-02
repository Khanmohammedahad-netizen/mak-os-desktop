import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Brevo sends an array of event objects
interface BrevoEvent {
  event: string;      // 'delivered' | 'opened' | 'click' | 'bounce' | 'spam' | 'invalid_email' | 'unsubscribed'
  email?: string;
  messageId?: string; // Brevo message ID (matches brevo_id in outreach_logs)
  subject?: string;
  date?: string;
  reason?: string;
  [key: string]: unknown;
}

const TERMINAL_STATUSES = new Set(['bounce', 'invalid_email', 'unsubscribed', 'spam']);

export async function POST(req: NextRequest) {
  let events: BrevoEvent[];
  try {
    const body = await req.json() as BrevoEvent | BrevoEvent[];
    events = Array.isArray(body) ? body : [body];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  for (const ev of events) {
    if (!ev.messageId) continue;

    const { error } = await supabaseAdmin
      .from('outreach_logs')
      .update({
        status: ev.event,
        metadata: ev,
      })
      .eq('brevo_id', ev.messageId);

    if (error) {
      console.error('[webhook/brevo] update error:', error.message, 'messageId:', ev.messageId);
    }

    // Bounce / spam → enqueue DeliverabilityAgent job in Phase C.
    // For now log to agent_jobs as pending so Phase C can drain it.
    if (TERMINAL_STATUSES.has(ev.event)) {
      await supabaseAdmin.from('agent_jobs').insert({
        agent: 'DeliverabilityAgent',
        payload: { trigger: ev.event, messageId: ev.messageId, email: ev.email },
        status: 'pending',
      });
    }
  }

  return new NextResponse(null, { status: 200 });
}
